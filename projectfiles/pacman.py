import pygame
from pygame.locals import *
from vector import Vector2
from constants import *
from entity import Entity
from sprites import PacmanSprites
import random

class Pacman(Entity):
    def __init__(self, node):
        Entity.__init__(self, node )
        self.name = PACMAN    
        self.color = YELLOW
        self.direction = LEFT
        self.setBetweenNodes(LEFT)
        self.alive = True
        self.sprites = PacmanSprites(self)
        self.ghosts = []
        self.pellets = []
        self.directionMethod = self.pacmanDirection
        self.lastDecisionTime = 0  # Anti-oscillation: track when we last changed direction
        self.decisionCooldown = 0.15  # Minimum time between direction changes when fleeing

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

    def shouldFleeFromGhost(self, dt):
        """Check if Pacman should reverse direction to flee from an approaching ghost"""
        # Anti-oscillation: don't change direction too frequently
        self.lastDecisionTime += dt
        if self.lastDecisionTime < self.decisionCooldown:
            return False
        
        # Check for dangerous ghosts approaching from the direction we're heading
        danger_threshold = (5 * TILEWIDTH) ** 2
        
        ghost_ahead = False
        ghost_behind = False
        
        for ghost in self.ghosts:
            # Only flee from ghosts that are dangerous (not frightened or spawning)
            if ghost.mode.current not in (FREIGHT, SPAWN):
                # Distance to ghost
                d_squared = (ghost.position - self.position).magnitudeSquared()
                if d_squared < danger_threshold:
                    # Check if ghost is ahead or behind
                    ghost_vec = ghost.position - self.position
                    
                    is_ahead = False
                    is_behind = False
                    
                    if self.direction == RIGHT:
                        is_ahead = ghost_vec.x > 0
                        is_behind = ghost_vec.x < 0
                    elif self.direction == LEFT:
                        is_ahead = ghost_vec.x < 0
                        is_behind = ghost_vec.x > 0
                    elif self.direction == DOWN:
                        is_ahead = ghost_vec.y > 0
                        is_behind = ghost_vec.y < 0
                    elif self.direction == UP:
                        is_ahead = ghost_vec.y < 0
                        is_behind = ghost_vec.y > 0
                    
                    if is_ahead:
                        ghost_ahead = True
                    if is_behind:
                        ghost_behind = True
        
        # Only reverse if ghost ahead AND no ghost behind (to prevent oscillation)
        if ghost_ahead and not ghost_behind:
            self.lastDecisionTime = 0  # Reset cooldown
            return True
        
        return False

    def update(self, dt):	
        self.sprites.update(dt)
        self.position += self.directions[self.direction]*self.speed*dt
        
        if self.overshotTarget():
            self.node = self.target
            
            # Handle portal teleportation
            if self.node.neighbors[PORTAL] is not None:
                self.node = self.node.neighbors[PORTAL]
            
            # Use AI to find best direction
            directions = self.validDirections()
            direction = self.directionMethod(directions)
            
            self.target = self.getNewTarget(direction)
            if self.target is not self.node:
                self.direction = direction
            else:
                self.target = self.getNewTarget(self.direction)

            if self.target is self.node:
                self.direction = STOP
            self.setPosition()
        else: 
            # Check if we should flee from a ghost approaching from ahead
            if self.shouldFleeFromGhost(dt):
                self.reverseDirection()
            else:
                direction = self.directionMethod(self.validDirections())
                if self.oppositeDirection(direction):
                    self.reverseDirection()

    def getValidKey(self):
        # Kept for reference or fallback
        key_pressed = pygame.key.get_pressed()
        if key_pressed[K_UP]:
            return UP
        if key_pressed[K_DOWN]:
            return DOWN
        if key_pressed[K_LEFT]:
            return LEFT
        if key_pressed[K_RIGHT]:
            return RIGHT
        return STOP  

    def pacmanDirection(self, directions):
        """AI: chase frightened ghosts, prioritize power pellets, flee from dangerous ghosts, collect pellets"""
        if not directions:
            return STOP
        
        # Separate power pellets from regular pellets
        power_pellet_locs = set()
        regular_pellet_locs = set()
        has_power_pellets = False
        
        for p in self.pellets.pelletList:
            loc1 = (int(round(p.position.x)), int(round(p.position.y)))
            loc2 = (int(p.position.x), int(p.position.y))
            if p.name == POWERPELLET:
                power_pellet_locs.add(loc1)
                power_pellet_locs.add(loc2)
                has_power_pellets = True
            else:
                regular_pellet_locs.add(loc1)
                regular_pellet_locs.add(loc2)
        
        # Find frightened ghosts (we can chase them!) and dangerous ghosts
        frightened_ghosts = []
        dangerous_ghosts = []
        
        for ghost in self.ghosts:
            d_squared = (ghost.position - self.position).magnitudeSquared()
            if ghost.mode.current == FREIGHT:
                frightened_ghosts.append((ghost, d_squared))
            elif ghost.mode.current != SPAWN:
                dangerous_ghosts.append((ghost, d_squared))
        
        # PRIORITY 1: Chase frightened ghosts!
        if frightened_ghosts:
            return self.findDirectionToGhost(directions, frightened_ghosts)
        
        # Danger threshold - 6 tiles for detection
        danger_threshold = (6 * TILEWIDTH) ** 2
        ghosts_in_danger_zone = [(g, d) for g, d in dangerous_ghosts if d < danger_threshold]
        
        # Determine target pellets
        if has_power_pellets:
            target_locs = power_pellet_locs
        else:
            target_locs = regular_pellet_locs
        
        # PRIORITY 2: If dangerous ghosts are nearby, use safe pathfinding
        if ghosts_in_danger_zone:
            best_direction = self.findSafestDirectionToPellet(directions, ghosts_in_danger_zone, target_locs)
            if best_direction is not None:
                return best_direction
        
        # PRIORITY 3: No danger - go straight for pellets
        if target_locs:
            return self.findBestDirectionToPellet(directions, target_locs)
        
        # No pellets left, just continue
        if self.direction in directions:
            return self.direction
        return directions[0]
    
    def findDirectionToGhost(self, directions, frightened_ghosts):
        """Find direction towards the nearest frightened ghost to eat it"""
        best_direction = directions[0]
        min_distance = float('inf')
        
        for direction in directions:
            neighbor = self.node.neighbors[direction]
            if neighbor is None:
                continue
            
            # Find distance to nearest frightened ghost from this neighbor
            for ghost, _ in frightened_ghosts:
                d = (ghost.position - neighbor.position).magnitudeSquared()
                if d < min_distance:
                    min_distance = d
                    best_direction = direction
        
        return best_direction
    
    def findSafestDirectionToPellet(self, directions, dangerous_ghosts, pellet_locs):
        """Find direction that balances safety from ghosts with progress towards pellets"""
        best_direction = None
        best_score = float('-inf')
        
        for direction in directions:
            neighbor = self.node.neighbors[direction]
            if neighbor is None:
                continue
            
            # Calculate minimum distance to any dangerous ghost from this neighbor
            min_ghost_dist = float('inf')
            for ghost, _ in dangerous_ghosts:
                d = (ghost.position - neighbor.position).magnitudeSquared()
                if d < min_ghost_dist:
                    min_ghost_dist = d
            
            # Skip directions that lead too close to ghosts (critical danger zone)
            critical_danger = (3 * TILEWIDTH) ** 2
            if min_ghost_dist < critical_danger:
                continue  # This direction is too dangerous
            
            # Calculate distance to nearest pellet
            pellet_dist = self.bfsDistance(neighbor, pellet_locs) if pellet_locs else 0
            
            # Score: balance safety with pellet progress
            # Ghost distance is important but we also want to reach pellets
            safety_score = min_ghost_dist
            pellet_score = -pellet_dist * 1000  # Weight pellets more when we have some safety margin
            
            total_score = safety_score + pellet_score
            
            if total_score > best_score:
                best_score = total_score
                best_direction = direction
        
        # If all directions are dangerous, pick the safest one (don't return None)
        if best_direction is None:
            max_ghost_dist = -1
            for direction in directions:
                neighbor = self.node.neighbors[direction]
                if neighbor is None:
                    continue
                min_ghost_dist = float('inf')
                for ghost, _ in dangerous_ghosts:
                    d = (ghost.position - neighbor.position).magnitudeSquared()
                    if d < min_ghost_dist:
                        min_ghost_dist = d
                if min_ghost_dist > max_ghost_dist:
                    max_ghost_dist = min_ghost_dist
                    best_direction = direction
        
        return best_direction
    
    def findBestDirectionToPellet(self, directions, target_locs):
        """Find direction that leads to nearest target pellet"""
        best_direction = directions[0]
        best_distance = float('inf')
        
        for direction in directions:
            neighbor = self.node.neighbors[direction]
            if neighbor is not None:
                distance = self.bfsDistance(neighbor, target_locs)
                if distance < best_distance:
                    best_distance = distance
                    best_direction = direction
        
        return best_direction

    def bfsDistance(self, start_node, pellet_locs, max_depth=500):
        """BFS to find distance to nearest pellet - explore entire map"""
        queue = [(start_node, 0)]
        visited = {start_node}
        
        while queue:
            current, dist = queue.pop(0)
            
            # Check if pellet at this node (use multiple coordinate methods for robustness)
            cx, cy = int(round(current.position.x)), int(round(current.position.y))
            if (cx, cy) in pellet_locs:
                return dist
            
            # Also check with integer truncation
            cx2, cy2 = int(current.position.x), int(current.position.y)
            if (cx2, cy2) in pellet_locs:
                return dist
            
            # Add neighbors to queue - NO DEPTH LIMIT, explore entire map
            for neighbor in current.neighbors.values():
                if neighbor is not None and neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, dist + 1))
        
        # No pellets found in entire map
        return float('inf')

    def isSafe(self, node):
        # Check if any ghost is too close to this node
        safe_distance = (4 * TILEWIDTH)**2 # Increased safe distance
        for ghost in self.ghosts:
            # If ghost is in spawn or frightened, we are generally safe
            if ghost.mode.current == SPAWN or ghost.mode.current == FREIGHT:
                continue
                
            d = (ghost.position - node.position).magnitudeSquared()
            if d < safe_distance:
                return False
        return True

    def getNearestGhostDistance(self, node):
        min_d = float('inf')
        for ghost in self.ghosts:
            d = (ghost.position - node.position).magnitudeSquared()
            if d < min_d:
                min_d = d
        return min_d

    def distanceToNearestPellet(self, start_node, pellet_locs):
        # BFS to find nearest pellet across entire map
        queue = [(start_node, 0)]
        visited = {start_node}
        
        while queue:
            current, dist = queue.pop(0)
            
            # Increased depth limit to explore entire map
            if dist > 200: 
                return float('inf')

            # Check if this node has a pellet
            cx, cy = int(round(current.position.x)), int(round(current.position.y))
            if (cx, cy) in pellet_locs:
                return dist
            
            # Also check neighbors for pellet as a fallback
            for direction in [UP, DOWN, LEFT, RIGHT]:
                neighbor = current.neighbors[direction]
                if neighbor is not None and neighbor not in visited:
                    nx, ny = int(round(neighbor.position.x)), int(round(neighbor.position.y))
                    if (nx, ny) in pellet_locs:
                        return dist + 1
            
            # Continue BFS
            for neighbor in current.neighbors.values():
                if neighbor is not None and neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, dist + 1))
        
        return float('inf')

    def hasPellet(self, node):
        # This is an approximation. 
        # Ideally, we map pellets to nodes. Since pellets have positions, 
        # checking overlap with node position is close enough.
        # However, checking entire pellet list every node is slow (O(N)).
        # Optimized approach: check simple distance to all pellets.
        
        node_pos = node.position
        for pellet in self.pellets.pelletList:
            # Calculate manhattan dist for speed first
            dx = abs(pellet.position.x - node_pos.x)
            dy = abs(pellet.position.y - node_pos.y)
            if dx <= TILEWIDTH // 2 and dy <= TILEHEIGHT // 2:
                return True
        return False

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