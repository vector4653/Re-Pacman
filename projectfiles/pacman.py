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

    # ==================== MERGE SORT IMPLEMENTATION ====================
    def mergeSort(self, arr, key_func=None):
        """
        Merge Sort - Divide and Conquer sorting algorithm
        Time Complexity: O(n log n)
        Space Complexity: O(n)
        
        Args:
            arr: List of items to sort
            key_func: Function to extract comparison key from each item
        Returns:
            New sorted list
        """
        if key_func is None:
            key_func = lambda x: x
        
        # Base case: arrays with 0 or 1 element are already sorted
        if len(arr) <= 1:
            return arr[:]
        
        # DIVIDE: Split array into two halves
        mid = len(arr) // 2
        left_half = arr[:mid]
        right_half = arr[mid:]
        
        # CONQUER: Recursively sort each half
        sorted_left = self.mergeSort(left_half, key_func)
        sorted_right = self.mergeSort(right_half, key_func)
        
        # COMBINE: Merge the two sorted halves
        return self.merge(sorted_left, sorted_right, key_func)
    
    def merge(self, left, right, key_func):
        """
        Merge two sorted arrays into one sorted array
        
        Args:
            left: First sorted array
            right: Second sorted array
            key_func: Function to extract comparison key
        Returns:
            Merged sorted array
        """
        result = []
        left_idx = 0
        right_idx = 0
        
        # Compare elements from both arrays and add smaller one to result
        while left_idx < len(left) and right_idx < len(right):
            if key_func(left[left_idx]) <= key_func(right[right_idx]):
                result.append(left[left_idx])
                left_idx += 1
            else:
                result.append(right[right_idx])
                right_idx += 1
        
        # Add remaining elements from left array (if any)
        while left_idx < len(left):
            result.append(left[left_idx])
            left_idx += 1
        
        # Add remaining elements from right array (if any)
        while right_idx < len(right):
            result.append(right[right_idx])
            right_idx += 1
        
        return result
    
    def getSortedPelletsByDistance(self, pellet_type=None):
        """
        Get pellets sorted by distance from Pacman (nearest first)
        Uses custom merge sort implementation - O(n log n)
        
        Args:
            pellet_type: Optional filter - POWERPELLET or PELLET constant.
                         If None, returns all pellets sorted.
        
        Returns:
            List of (distance_squared, pellet) tuples, sorted by distance
        """
        if not self.pellets.pelletList:
            return []
        
        # Create list of (distance_squared, pellet) tuples
        pellet_distances = []
        for pellet in self.pellets.pelletList:
            # Filter by pellet type if specified
            if pellet_type is not None and pellet.name != pellet_type:
                continue
            d_squared = (pellet.position - self.position).magnitudeSquared()
            pellet_distances.append((d_squared, pellet))
        
        # Sort using our merge sort implementation with distance as key
        sorted_pellets = self.mergeSort(pellet_distances, key_func=lambda x: x[0])
        
        return sorted_pellets
    
    def getNearestPellets(self, count=5, pellet_type=None):
        """
        Get the N nearest pellets using merge sort
        
        Args:
            count: Number of nearest pellets to return
            pellet_type: Optional filter - POWERPELLET or PELLET constant
        Returns:
            List of pellet objects (nearest first)
        """
        sorted_pellets = self.getSortedPelletsByDistance(pellet_type)
        return [pellet for dist, pellet in sorted_pellets[:count]]
    # ==================== END MERGE SORT ====================

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
        """
        Find direction using hybrid approach:
        - Early game: Use standard BFS
        - Mid game: Use sorted pellets for efficient targeting
        - Late game: Use divide-and-conquer region targeting + sorted pellets
        """
        best_direction = directions[0]
        pellet_count = len(self.pellets.pelletList)
        
        # Determine if we're targeting power pellets
        # Check if target_locs contains power pellet locations
        power_pellets_exist = any(p.name == POWERPELLET for p in self.pellets.pelletList)
        targeting_power_pellets = False
        
        if power_pellets_exist:
            # Check if target_locs matches power pellet locations
            for p in self.pellets.pelletList:
                if p.name == POWERPELLET:
                    loc = (int(round(p.position.x)), int(round(p.position.y)))
                    if loc in target_locs:
                        targeting_power_pellets = True
                        break
        
        # If targeting power pellets, use simple sorted pellet approach (skip centroid)
        # Power pellets are few (usually 4), so centroid-based targeting doesn't help
        if targeting_power_pellets:
            sorted_pellets = self.getSortedPelletsByDistance(pellet_type=POWERPELLET)
            if sorted_pellets:
                # Target the nearest power pellet directly
                nearest_dist, nearest_pellet = sorted_pellets[0]
                target_pos = nearest_pellet.position
                
                best_distance = float('inf')
                for direction in directions:
                    neighbor = self.node.neighbors[direction]
                    if neighbor is not None:
                        dist = (neighbor.position - target_pos).magnitudeSquared()
                        if dist < best_distance:
                            best_distance = dist
                            best_direction = direction
                return best_direction
        
        # Late game (<30 pellets): use divide-and-conquer region targeting
        # Only for regular pellets (power pellets handled above)
        if pellet_count < 30 and pellet_count > 0:
            # Use filtered centroid for regular pellets only
            centroid = self.getTargetCentroid(pellet_type=PELLET)
            if centroid is not None:
                best_score = float('inf')
                
                for direction in directions:
                    neighbor = self.node.neighbors[direction]
                    if neighbor is None:
                        continue
                    
                    # Combine centroid distance with local BFS
                    centroid_dist = (neighbor.position - centroid).magnitudeSquared()
                    local_bfs_dist = self.bfsDistance(neighbor, target_locs, max_depth=50)
                    
                    # Weight centroid more as pellets become sparser
                    centroid_weight = max(0.001, 0.01 * (30 - pellet_count) / 30)
                    score = centroid_dist * centroid_weight + local_bfs_dist
                    
                    if score < best_score:
                        best_score = score
                        best_direction = direction
                
                # Only return if we found a valid path (score is not infinity)
                if best_score < float('inf'):
                    return best_direction
        
        # Mid/Early game: Use merge-sorted pellets for efficient nearest-pellet targeting
        # FIXED: Use pellet type filter to prioritize power pellets when they exist
        if targeting_power_pellets:
            sorted_pellets = self.getSortedPelletsByDistance(pellet_type=POWERPELLET)
        else:
            sorted_pellets = self.getSortedPelletsByDistance(pellet_type=PELLET)
        
        # Fallback to all pellets if filtered list is empty
        if not sorted_pellets:
            sorted_pellets = self.getSortedPelletsByDistance()
        
        if sorted_pellets:
            # Target the nearest 3 pellets of the target type for decision making
            nearest_pellet_locs = set()
            for i, (dist, pellet) in enumerate(sorted_pellets[:3]):
                loc = (int(round(pellet.position.x)), int(round(pellet.position.y)))
                nearest_pellet_locs.add(loc)
            
            # Find direction that gets us closest to nearest pellets
            best_distance = float('inf')
            for direction in directions:
                neighbor = self.node.neighbors[direction]
                if neighbor is not None:
                    # Check direct distance to nearest pellets (faster than full BFS)
                    for loc in nearest_pellet_locs:
                        dist = (neighbor.position.x - loc[0])**2 + (neighbor.position.y - loc[1])**2
                        if dist < best_distance:
                            best_distance = dist
                            best_direction = direction
            
            # Validate with limited BFS to ensure path exists
            if best_distance < float('inf'):
                return best_direction
        
        # Fallback: use standard BFS approach
        best_distance = float('inf')
        for direction in directions:
            neighbor = self.node.neighbors[direction]
            if neighbor is not None:
                distance = self.bfsDistance(neighbor, target_locs)
                if distance < best_distance:
                    best_distance = distance
                    best_direction = direction
        
        return best_direction
    
    def findDensestRegion(self, pellet_positions, bounds, min_size=3):
        """Recursively find the region with highest pellet density using divide-and-conquer"""
        min_x, max_x, min_y, max_y = bounds
        
        # Base case: region is small enough
        if max_x - min_x < min_size * TILEWIDTH or max_y - min_y < min_size * TILEHEIGHT:
            return bounds, len(pellet_positions)
        
        # Divide into 4 sub-regions
        mid_x = (min_x + max_x) // 2
        mid_y = (min_y + max_y) // 2
        
        regions = {
            'NW': (min_x, mid_x, min_y, mid_y),
            'NE': (mid_x, max_x, min_y, mid_y),
            'SW': (min_x, mid_x, mid_y, max_y),
            'SE': (mid_x, max_x, mid_y, max_y)
        }
        
        best_region = None
        best_count = -1
        best_positions = []
        
        for name, (rx1, rx2, ry1, ry2) in regions.items():
            region_pellets = [(x, y) for x, y in pellet_positions 
                              if rx1 <= x < rx2 and ry1 <= y < ry2]
            count = len(region_pellets)
            if count > best_count:
                best_count = count
                best_region = (rx1, rx2, ry1, ry2)
                best_positions = region_pellets
        
        # If no pellets found in any region, return current bounds
        if best_count == 0:
            return bounds, 0
        
        # Conquer: recurse into densest region
        return self.findDensestRegion(best_positions, best_region, min_size)
    
    def getTargetCentroid(self, pellet_type=None):
        """
        Get the center point of the densest pellet cluster
        
        Args:
            pellet_type: Optional filter - POWERPELLET or PELLET constant.
                         If None, uses all pellets.
        """
        if not self.pellets.pelletList:
            return None
        
        # Filter pellets by type if specified
        if pellet_type is not None:
            filtered_pellets = [p for p in self.pellets.pelletList if p.name == pellet_type]
        else:
            filtered_pellets = self.pellets.pelletList
        
        if not filtered_pellets:
            return None
        
        positions = [(p.position.x, p.position.y) for p in filtered_pellets]
        
        # If very few pellets, just target the nearest one directly
        if len(positions) <= 3:
            # Find nearest pellet to current position
            min_dist = float('inf')
            nearest = None
            for x, y in positions:
                d = (x - self.position.x) ** 2 + (y - self.position.y) ** 2
                if d < min_dist:
                    min_dist = d
                    nearest = (x, y)
            if nearest:
                return Vector2(nearest[0], nearest[1])
            return None
        
        bounds = (0, SCREENWIDTH, 0, SCREENHEIGHT)
        dense_bounds, count = self.findDensestRegion(positions, bounds)
        
        if count == 0:
            return None
        
        # Calculate centroid of pellets in the dense region
        rx1, rx2, ry1, ry2 = dense_bounds
        in_region = [(x, y) for x, y in positions 
                     if rx1 <= x < rx2 and ry1 <= y < ry2]
        
        if in_region:
            cx = sum(x for x, y in in_region) / len(in_region)
            cy = sum(y for x, y in in_region) / len(in_region)
            return Vector2(cx, cy)
        
        return None

    def bfsDistance(self, start_node, pellet_locs, max_depth=500):
        """BFS to find distance to nearest pellet with configurable depth limit"""
        queue = [(start_node, 0)]
        visited = {start_node}
        
        while queue:
            current, dist = queue.pop(0)
            
            # Respect max_depth to limit search in late-game hybrid mode
            if dist > max_depth:
                continue
            
            # Check if pellet at this node (use multiple coordinate methods for robustness)
            cx, cy = int(round(current.position.x)), int(round(current.position.y))
            if (cx, cy) in pellet_locs:
                return dist
            
            # Also check with integer truncation
            cx2, cy2 = int(current.position.x), int(current.position.y)
            if (cx2, cy2) in pellet_locs:
                return dist
            
            # Add neighbors to queue
            for neighbor in current.neighbors.values():
                if neighbor is not None and neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, dist + 1))
        
        # No pellets found within depth limit
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