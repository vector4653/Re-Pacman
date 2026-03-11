import pygame
from pygame.locals import *
from vector import Vector2
from constants import *
from random import randint
from collections import deque

class Entity(object):
    def __init__(self, node):
        self.name = None
        self.directions = {UP:Vector2(0, -1),DOWN:Vector2(0, 1), 
                          LEFT:Vector2(-1, 0), RIGHT:Vector2(1, 0), STOP:Vector2()}
        self.direction = STOP
        self.setSpeed(100)
        self.radius = 10
        self.collideRadius = 5
        self.color = WHITE
        self.visible = True
        self.disablePortal = False
        self.goal = None
        self.directionMethod = self.randomDirection
        self.setStartNode(node)
        self.image = None
        self.dpDistCache = {}       # DP: memoised hop-distances keyed by (node_id, tile_gx, tile_gy)

    def setPosition(self):
        self.position = self.node.position.copy()

    def update(self, dt):
        self.position += self.directions[self.direction]*self.speed*dt
         
        if self.overshotTarget():
            self.node = self.target
            directions = self.validDirections()
            direction = self.directionMethod(directions)
            if not self.disablePortal:
                if self.node.neighbors[PORTAL] is not None:
                    self.node = self.node.neighbors[PORTAL]
            self.target = self.getNewTarget(direction)
            if self.target is not self.node:
                self.direction = direction
            else:
                self.target = self.getNewTarget(self.direction)

            self.setPosition()
          
    def validDirection(self, direction):
        if direction is not STOP:
            if self.name in self.node.access[direction]:
                if self.node.neighbors[direction] is not None:
                    return True
        return False

    def getNewTarget(self, direction):
        if self.validDirection(direction):
            return self.node.neighbors[direction]
        return self.node

    def overshotTarget(self):
        if self.target is not None:
            vec1 = self.target.position - self.node.position
            vec2 = self.position - self.node.position
            node2Target = vec1.magnitudeSquared()
            node2Self = vec2.magnitudeSquared()
            return node2Self >= node2Target
        return False

    def reverseDirection(self):
        self.direction *= -1
        temp = self.node
        self.node = self.target
        self.target = temp
        
    def oppositeDirection(self, direction):
        if direction is not STOP:
            if direction == self.direction * -1:
                return True
        return False

    def validDirections(self):
        directions = []
        for key in [UP, DOWN, LEFT, RIGHT]:
            if self.validDirection(key):
                if key != self.direction * -1:
                    directions.append(key)
        if len(directions) == 0:
            directions.append(self.direction * -1)
        return directions

    def randomDirection(self, directions):
        return directions[randint(0, len(directions)-1)]

    def dpShortestPath(self, from_node, goal_pos):
        """
        DP: Memoised BFS hop-count from from_node to goal_pos in the maze graph.
        Subproblem: shortest distance from a given node to a tile-quantised goal.
        Optimal substructure: shortest path to goal passes through shortest path
        to intermediate nodes (Bellman's principle).
        Cache hit is O(1); cache miss triggers a BFS in O(V+E).
        Cache is bounded to 10 000 entries to prevent unbounded growth.
        """
        # Quantise goal to tile grid for stable, reusable cache keys
        gx = int(round(goal_pos.x / TILEWIDTH))
        gy = int(round(goal_pos.y / TILEHEIGHT))
        cache_key = (id(from_node), gx, gy)

        if cache_key in self.dpDistCache:
            return self.dpDistCache[cache_key]   # O(1) DP lookup

        # BFS through the maze graph.
        # For goals at intersection tiles, returns exact hop-count (breaks early).
        # For corridor positions (no node at that tile), returns the hop-count to
        # the intersection node closest by Manhattan tile distance — a good
        # approximation since corridor pellets lie between their two endpoint nodes.
        queue = deque([(from_node, 0)])
        visited = {id(from_node)}
        best_tile_dist = float('inf')
        result = float('inf')

        while queue:
            current, dist = queue.popleft()
            cx = int(round(current.position.x / TILEWIDTH))
            cy = int(round(current.position.y / TILEHEIGHT))
            tile_dist = abs(cx - gx) + abs(cy - gy)

            if tile_dist < best_tile_dist:
                best_tile_dist = tile_dist
                result = dist

            if tile_dist == 0:
                break  # Exact match; BFS order guarantees this is the optimal hop-count

            for direction in [UP, DOWN, LEFT, RIGHT]:
                neighbor = current.neighbors[direction]
                if neighbor is not None and id(neighbor) not in visited:
                    visited.add(id(neighbor))
                    queue.append((neighbor, dist + 1))

        # Evict cache before it grows unbounded
        if len(self.dpDistCache) >= 10000:
            self.dpDistCache.clear()
        self.dpDistCache[cache_key] = result
        return result

    def goalDirection(self, directions):
        """
        Original Pac-Man ghost targeting: at each intersection, pick the
        direction whose neighbour node is closest (Euclidean) to self.goal.
        This intentionally imperfect heuristic is a core part of the classic
        ghost AI — ghosts are predictable but not optimal pathfinders.
        DP shortest-path is reserved for Pacman's own AI (pacmanDirection).
        """
        if self.goal is None:
            return directions[0]

        distances = []
        for direction in directions:
            neighbor = self.node.neighbors[direction]
            if neighbor is not None:
                dist = (neighbor.position - self.goal).magnitudeSquared()
                distances.append(dist)
            else:
                distances.append(float('inf'))

        index = distances.index(min(distances))
        return directions[index]

    def setStartNode(self, node):
        self.node = node
        self.startNode = node
        self.target = node
        self.setPosition()

    def setBetweenNodes(self, direction):
        if self.node.neighbors[direction] is not None:
            self.target = self.node.neighbors[direction]
            self.position = (self.node.position + self.target.position) / 2.0

    def reset(self):
        self.setStartNode(self.startNode)
        self.direction = STOP
        self.speed = 100
        self.visible = True

    def setSpeed(self, speed):
        self.speed = speed * TILEWIDTH / 16

    def render(self, screen):
        if self.visible:
            if self.image is not None:
                adjust = Vector2(TILEWIDTH, TILEHEIGHT) / 2
                p = self.position - adjust
                screen.blit(self.image, p.asTuple())
            else:
                p = self.position.asInt()
                pygame.draw.circle(screen, self.color, p, self.radius)