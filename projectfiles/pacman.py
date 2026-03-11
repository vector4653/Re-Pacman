import pygame
from pygame.locals import *
from vector import Vector2
from constants import *
from entity import Entity
from sprites import PacmanSprites

class Pacman(Entity):
    def __init__(self, node):
        Entity.__init__(self, node)
        self.name = PACMAN    
        self.color = YELLOW
        self.direction = LEFT
        self.setBetweenNodes(LEFT)
        self.alive = True
        self.sprites = PacmanSprites(self)
        self.ghosts = []
        self.pellets = []
        
        # ==========================================
        # DAA PROJECT: Safety-Assured Pathfinding
        # ==========================================
        self.directionMethod = self.interceptionAvoidanceAI
        self.pos_to_node_cache = {}

    def reset(self):
        Entity.reset(self)
        self.direction = LEFT
        self.setBetweenNodes(LEFT)
        self.alive = True
        self.image = self.sprites.getStartImage()
        self.sprites.reset()

    def die(self):
        self.alive = False
        self.direction = STOP

    def setGameState(self, ghosts, pellets):
        self.ghosts = ghosts
        self.pellets = pellets
        if hasattr(self, '_cached_nodes'):
            del self._cached_nodes
        self.pos_to_node_cache.clear() 

    def update(self, dt):   
        self.sprites.update(dt)
        self.position += self.directions[self.direction] * self.speed * dt
        
        if self.overshotTarget():
            self.node = self.target
            
            if self.node.neighbors[PORTAL] is not None:
                self.node = self.node.neighbors[PORTAL]
                
            all_open_dirs = [d for d in [UP, DOWN, LEFT, RIGHT] 
                             if self.node.neighbors.get(d) is not None]
            
            direction = self.directionMethod(all_open_dirs)
            
            self.target = self.getNewTarget(direction)
            if self.target is not self.node:
                self.direction = direction
            else:
                self.target = self.getNewTarget(self.direction)

            if self.target is self.node:
                self.direction = STOP
            self.setPosition()

    def eatPellets(self, pelletList):
        for pellet in pelletList:
            if self.collideCheck(pellet):
                return pellet
        return None    
    
    def collideGhost(self, ghost):
        return self.collideCheck(ghost)

    def collideCheck(self, other):
        d = self.position - other.position
        dSquared = d.magnitudeSquared()
        rSquared = (self.collideRadius + other.collideRadius)**2
        if dSquared <= rSquared:
            return True
        return False

    # =========================================================================
    # MULTI-SOURCE INTERCEPTION MAPPING AI
    # =========================================================================

    def interceptionAvoidanceAI(self, directions):
        if not directions:
            return STOP

        all_nodes = self.getAllNodes()

        # --- PRIORITY 1: HUNT FREIGHT (AFRAID) GHOSTS ---
        freight_ghosts = [g for g in self.ghosts if g.mode.current == FREIGHT]
        if freight_ghosts:
            hunt_dir = self.huntFreightGhosts(directions, freight_ghosts, all_nodes)
            if hunt_dir is not None:
                return hunt_dir

        ghost_dist = self.buildGhostDistanceMap(all_nodes)
        target_nodes = self.getTargetNodes(all_nodes)
        
        safe_directions = []
        survival_scores = {}
        
        for d in directions:
            start_node = self.node.neighbors[d]
            if start_node is None: continue
            
            # --- FIX 1: CONTINUOUS PHYSICAL CHECK (The "No Bumping" Filter) ---
            # Even if the graph says it's safe, look physically into the corridor
            immediate_death = False
            next_step_pos = self.position + self.directions[d] * TILEWIDTH
            
            for ghost in self.ghosts:
                if ghost.mode.current not in (SPAWN, FREIGHT):
                    dist_sq = (ghost.position - next_step_pos).magnitudeSquared()
                    # If this step puts us within 1.5 tiles of a ghost...
                    if dist_sq < (1.5 * TILEWIDTH)**2:
                        current_dist_sq = (ghost.position - self.position).magnitudeSquared()
                        # ...AND it physically moves us closer to them, it's a death trap!
                        if dist_sq < current_dist_sq:
                            immediate_death = True
                            break
                            
            # Graph-based instant death check (Ghost is 1 step away)
            if immediate_death or ghost_dist.get(id(start_node), float('inf')) <= 1:
                survival_scores[d] = -9999
                continue

            # --- PATH SIMULATION (BFS) ---
            queue = [(start_node, 1)] 
            visited = {id(start_node)}
            found_target_dist = float('inf')
            max_survival_depth = 1
            
            while queue:
                curr, dist = queue.pop(0)
                max_survival_depth = max(max_survival_depth, dist)
                
                if id(curr) in target_nodes:
                    found_target_dist = dist
                    break 
                
                for nd in [UP, DOWN, LEFT, RIGHT]:
                    neighbor = curr.neighbors.get(nd)
                    if neighbor is not None and id(neighbor) not in visited:
                        g_dist = ghost_dist.get(id(neighbor), float('inf'))
                        # FIX 2: Loosened Survival Condition
                        # As long as Pacman takes fewer steps than the ghost, it's safe!
                        if dist + 1 < g_dist:
                            visited.add(id(neighbor))
                            queue.append((neighbor, dist + 1))
                            
            if found_target_dist != float('inf'):
                # Add a tiny penalty to U-turns so he favors flowing forward smoothly
                penalty = 0.5 if self.oppositeDirection(d) else 0.0
                safe_directions.append((d, found_target_dist + penalty))
                
            survival_scores[d] = max_survival_depth

        # --- DECISION LOGIC ---
        
        # 1. Primary: Take the shortest strictly safe path to a target
        if safe_directions:
            safe_directions.sort(key=lambda x: x[1])
            return safe_directions[0][0]
            
        # 2. Fallback: Evasion Mode (Surrounded!)
        # FIX 3: Combine survival depth with physical distance to break ties & stop loops
        best_evasion = directions[0]
        best_score = -float('inf')
        
        for d in directions:
            if survival_scores.get(d, -9999) == -9999:
                continue # Skip guaranteed death directions
                
            # Score based heavily on how many safe steps this path provides
            depth_score = survival_scores.get(d, 0) * 1000
            
            # Tie-breaker: physically move away from the nearest active ghost
            next_pos = self.position + self.directions[d] * TILEWIDTH
            min_g_dist = float('inf')
            for g in self.ghosts:
                if g.mode.current not in (SPAWN, FREIGHT):
                    dist = (g.position - next_pos).magnitudeSquared()
                    if dist < min_g_dist:
                        min_g_dist = dist
                        
            score = depth_score + min_g_dist
            
            # Massive penalty for U-turns in evasion mode to stop the looping/wiggling
            if self.oppositeDirection(d):
                score -= 10000
                
            if score > best_score:
                best_score = score
                best_evasion = d
                
        # Absolute last resort if completely trapped: just pick the furthest direction
        if best_score == -float('inf'):
            best_evasion = directions[0]
            max_dist = -1
            for d in directions:
                next_pos = self.position + self.directions[d] * TILEWIDTH
                active_ghosts = [g for g in self.ghosts if g.mode.current not in (SPAWN, FREIGHT)]
                if not active_ghosts: continue
                
                min_g = min([(g.position - next_pos).magnitudeSquared() for g in active_ghosts])
                if min_g > max_dist:
                    max_dist = min_g
                    best_evasion = d
                    
        return best_evasion

    def huntFreightGhosts(self, directions, freight_ghosts, all_nodes):
        """BFS directly toward the nearest afraid ghost, avoiding dangerous ones."""
        danger_dist = self.buildGhostDistanceMap(all_nodes)

        # Collect nodes at/near each freight ghost as hunt targets
        hunt_targets = set()
        for ghost in freight_ghosts:
            if hasattr(ghost, 'node') and ghost.node:
                hunt_targets.add(id(ghost.node))
            if hasattr(ghost, 'target') and ghost.target:
                hunt_targets.add(id(ghost.target))
            closest = self.getClosestNodeToPosition(ghost.position, all_nodes)
            if closest:
                hunt_targets.add(id(closest))

        best_dir = None
        best_dist = float('inf')

        for d in directions:
            start_node = self.node.neighbors.get(d)
            if start_node is None:
                continue

            # Skip if first step walks into a dangerous ghost
            if danger_dist.get(id(start_node), float('inf')) <= 1:
                continue

            # Physical safety: don't step toward a normal ghost
            next_step_pos = self.position + self.directions[d] * TILEWIDTH
            danger_step = False
            for ghost in self.ghosts:
                if ghost.mode.current not in (SPAWN, FREIGHT):
                    dist_sq = (ghost.position - next_step_pos).magnitudeSquared()
                    if dist_sq < (1.5 * TILEWIDTH)**2:
                        if dist_sq < (ghost.position - self.position).magnitudeSquared():
                            danger_step = True
                            break
            if danger_step:
                continue

            # BFS toward hunt targets, still routing around dangerous ghosts
            queue = [(start_node, 1)]
            visited = {id(self.node), id(start_node)}

            while queue:
                curr, dist = queue.pop(0)
                if dist >= best_dist:
                    break

                if id(curr) in hunt_targets:
                    best_dist = dist
                    best_dir = d
                    break

                for nd in [UP, DOWN, LEFT, RIGHT]:
                    neighbor = curr.neighbors.get(nd)
                    if neighbor is not None and id(neighbor) not in visited:
                        if danger_dist.get(id(neighbor), float('inf')) > 1:
                            visited.add(id(neighbor))
                            queue.append((neighbor, dist + 1))

        return best_dir  # None = no safe path to any freight ghost, fall back to normal AI

    def buildGhostDistanceMap(self, all_nodes):
        ghost_dist = {id(n): float('inf') for n in all_nodes}
        queue = []
        
        for ghost in self.ghosts:
            if ghost.mode.current not in (SPAWN, FREIGHT):
                danger_nodes = []
                if hasattr(ghost, 'node') and ghost.node:
                    danger_nodes.append(ghost.node)
                if hasattr(ghost, 'target') and ghost.target:
                    danger_nodes.append(ghost.target)
                    
                for gn in danger_nodes:
                    if ghost_dist[id(gn)] > 0:
                        ghost_dist[id(gn)] = 0
                        queue.append((gn, 0))
                        
        while queue:
            curr, dist = queue.pop(0)
            for d in [UP, DOWN, LEFT, RIGHT]:
                neighbor = curr.neighbors.get(d)
                if neighbor is not None:
                    if dist + 1 < ghost_dist[id(neighbor)]:
                        ghost_dist[id(neighbor)] = dist + 1
                        queue.append((neighbor, dist + 1))
                        
        return ghost_dist

    def getTargetNodes(self, all_nodes):
        target_nodes = set()
        
        for pellet in self.pellets.pelletList:
            n = self.getClosestNodeToPosition(pellet.position, all_nodes)
            if n: target_nodes.add(id(n))
            
        for ghost in self.ghosts:
            if ghost.mode.current == FREIGHT:
                if hasattr(ghost, 'node') and ghost.node:
                    target_nodes.add(id(ghost.node))
                    
        return target_nodes
    
    def getAllNodes(self):
        if hasattr(self, '_cached_nodes'):
            return self._cached_nodes
            
        nodes = set()
        queue = [self.node]
        while queue:
            curr = queue.pop(0)
            if curr not in nodes:
                nodes.add(curr)
                for direction in [UP, DOWN, LEFT, RIGHT]:
                    neighbor = curr.neighbors.get(direction)
                    if neighbor is not None and neighbor not in nodes:
                        queue.append(neighbor)
                        
        self._cached_nodes = list(nodes)
        return self._cached_nodes

    def getClosestNodeToPosition(self, pos, all_nodes):
        coord = (int(pos.x), int(pos.y))
        if coord in self.pos_to_node_cache:
            return self.pos_to_node_cache[coord]
            
        best_node = None
        min_dist = float('inf')
        for node in all_nodes:
            d = (node.position - pos).magnitudeSquared()
            if d < min_dist:
                min_dist = d
                best_node = node
                
        self.pos_to_node_cache[coord] = best_node
        return best_node