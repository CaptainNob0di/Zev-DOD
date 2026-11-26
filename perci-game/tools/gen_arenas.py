#!/usr/bin/env python3
"""Perci Shorti story arenas: one hand-built arena per chapter, matching each episode's location.

One source for both games. This script designs the layouts (mirrored left/right so neither team has an edge),
checks every spawn can reach the whole map, then writes the drawings as simple paint ops:
  web:      perci-game/arenas.js        (window.PS_ARENAS)
  handheld: perci-r36-v11/src/arenas.lua
Run:  python3 tools/gen_arenas.py arenas.js <handheld>/src/arenas.lua
Op format (all arrays, coordinates in px):
  ['r',x,y,w,h,col,a]          fill rect          ['o',x,y,w,h,col,a,lw]   rect outline
  ['l',x1,y1,x2,y2,col,a,lw]   line               ['c',x,y,r,col,a]        fill circle
  ['e',x,y,rx,ry,col,a]        fill ellipse       ['p',[x,y,...],col,a]    fill convex polygon
  ['t',text,x,y,size,col,a,font,align]  text (font 'A' Anton / 'P' Poppins, align 'l'/'c'), y = top of text
  ['n',x,y,w,h,count,col,amin,amax,smin,smax,seed]  random specks (texture)
  ['g',x,y,r,col,a]            soft additive glow
Floors are in world coordinates (the games tilt them). Props are in sprite coordinates: the top face is
y 0..T (T = round(h * 0.7)), the front face is y T..T+Z.
"""
import json, math, random, sys, os

TILT = 0.7
W, H = 2400, 1440
CELL, INFL = 30, 24


def hexc(c, k=1.0):
    c = c.lstrip('#')
    r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    return '#%02x%02x%02x' % (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)))


class Ops(list):
    shade = 1.0
    def col(self, c): return hexc(c, self.shade)
    def r(self, x, y, w, h, c, a=1): self.append(['r', rd(x), rd(y), rd(w), rd(h), self.col(c), a])
    def o(self, x, y, w, h, c, a=1, lw=2): self.append(['o', rd(x), rd(y), rd(w), rd(h), self.col(c), a, lw])
    def l(self, x1, y1, x2, y2, c, a=1, lw=2): self.append(['l', rd(x1), rd(y1), rd(x2), rd(y2), self.col(c), a, lw])
    def c(self, x, y, r, c, a=1): self.append(['c', rd(x), rd(y), rd(r), self.col(c), a])
    def e(self, x, y, rx, ry, c, a=1): self.append(['e', rd(x), rd(y), rd(rx), rd(ry), self.col(c), a])
    def p(self, pts, c, a=1): self.append(['p', [rd(v) for v in pts], self.col(c), a])
    def t(self, s, x, y, size, c, a=1, font='A', align='c'): self.append(['t', s, rd(x), rd(y), size, self.col(c), a, font, align])
    def n(self, x, y, w, h, count, c, amin, amax, smin, smax, seed): self.append(['n', rd(x), rd(y), rd(w), rd(h), int(count), self.col(c), amin, amax, smin, smax, seed])
    def g(self, x, y, r, c, a=1): self.append(['g', rd(x), rd(y), rd(r), c, a])   # glows keep full brightness


def rd(v): return round(v, 1) if isinstance(v, float) else v


# ---------------------------------------------------------------- props
OUT = '#120a10'
def box(o, w, T, Z, top, front, edge=True):
    o.r(0, 0, w, T, top); o.r(0, T, w, Z, front)
    o.r(0, 0, w, 3, '#ffffff', 0.14); o.r(0, T, w, 4, '#000000', 0.25)
    if edge: o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)

def p_wall(o, w, T, Z, R, a):            # 1987 wood paneling
    o.r(0, 0, w, T, '#3a2412')
    o.n(0, 0, w, T, w * T / 60, '#24160a', 0.4, 0.8, 2, 5, 3)
    for x in range(0, int(w), 26):
        o.r(x, T, 24, Z, '#6a4628' if (x // 26) % 2 else '#5a3a22')
        o.l(x + 24, T, x + 24, T + Z, '#2a180c', 0.8, 2)
    o.r(0, T + Z - 10, w, 10, '#2a180c')
    o.r(0, T, w, 6, '#7a5634')
    o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)


def p_brick(o, w, T, Z, R, a):           # cinder-block stairwell wall
    o.r(0, 0, w, T, '#55555c'); o.n(0, 0, w, T, w * T / 80, '#3a3a40', 0.5, 0.9, 2, 4, 5)
    o.r(0, T, w, Z, '#8a8478')
    row = 0
    for y in range(int(T), int(T + Z), 16):
        off = 0 if row % 2 else 20
        o.l(0, y, w, y, '#5e5a52', 1, 2)
        for x in range(-off, int(w), 40):
            if x > 0: o.l(x, y, x, min(T + Z, y + 16), '#5e5a52', 1, 2)
        row += 1
    o.r(0, T + Z * 0.55, w, 6, '#c8b04a', 0.85)     # painted stripe
    o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)

def p_couch(o, w, T, Z, R, a):           # plaid couch
    plaid = a.get('col', '#8a3428')
    o.r(0, 0, w, T, hexc(plaid, 0.75))
    o.r(0, 0, w, T * 0.38, hexc(plaid, 0.55))                    # backrest
    n = max(2, int(w // 70))
    for i in range(n):
        cw = (w - 16) / n
        o.r(8 + i * cw + 2, T * 0.42, cw - 4, T * 0.5, plaid)
    o.r(0, T, w, Z, hexc(plaid, 0.9))
    for x in range(10, int(w), 22): o.l(x, T, x, T + Z, '#ffd60a', 0.35, 2)
    for y in range(int(T) + 8, int(T + Z), 12): o.l(0, y, w, y, '#2a0c08', 0.4, 2)
    o.r(0, 0, 14, T + Z, hexc(plaid, 0.6)); o.r(w - 14, 0, 14, T + Z, hexc(plaid, 0.6))   # arms
    o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)

def p_crt(o, w, T, Z, R, a):             # CRT on a wood stand, rabbit ears
    box(o, w, T, Z, '#4a3420', '#3a2614')
    tw = w - 12
    o.r(6, 2, tw, T + Z * 0.55, '#2c2c30'); o.o(6, 2, tw, T + Z * 0.55, OUT, 1, 3)
    o.r(12, T * 0.4 + 2, tw - 22, Z * 0.5, '#7fa8ff'); o.r(12, T * 0.4 + 2, tw - 22, Z * 0.5, '#ffffff', 0.12)
    o.g(w / 2, T * 0.4 + Z * 0.3, w * 0.7, '#8ab4ff', 0.25)
    o.c(w - 10, T * 0.6 + Z * 0.3, 3, '#c8c8c8')
    o.l(w * 0.45, 6, w * 0.2, -16, '#c8c8c8', 1, 2); o.l(w * 0.55, 6, w * 0.85, -16, '#c8c8c8', 1, 2)

def p_counter(o, w, T, Z, R, a):         # kitchen counter, cabinets
    o.r(0, 0, w, T, '#e8e0c8'); o.n(0, 0, w, T, w * T / 90, '#b8ae94', 0.4, 0.8, 1, 3, 7)
    if w > 120: o.e(w * 0.3, T / 2, 22, T * 0.32, '#9aa4ac'); o.e(w * 0.3, T / 2, 16, T * 0.22, '#5a646c')
    o.r(0, T, w, Z, '#7a4e2a')
    for x in range(4, int(w) - 30, 44):
        o.o(x, T + 8, 40, Z - 16, '#4a2c14', 1, 2); o.r(x + 18, T + 14, 4, 10, '#d0c090')
    o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)


def p_table(o, w, T, Z, R, a):           # wood table
    o.r(0, 0, w, T, '#8a5a30');
    for y in range(3, int(T), 9): o.l(2, y, w - 2, y, '#6a4020', 0.5, 1)
    o.r(0, T, w, 8, '#5a3818')
    o.r(0, T + 8, w, Z - 8, '#000000', 0.35)
    for x in (4, w - 12): o.r(x, T + 8, 8, Z - 8, '#4a2c12')
    o.o(0, 0, w, T, OUT, 1, 3)

def p_fridge(o, w, T, Z, R, a):          # fridge: 1987 avocado green, or stainless / white
    top, front = {'steel': ('#8a8e96', '#b8bcc4'), 'white': ('#c8c8c0', '#ecece4')}.get(a.get('style'), ('#7c8a3a', '#8e9c44'))
    box(o, w, T, Z, top, front)
    o.l(0, T + Z * 0.35, w, T + Z * 0.35, hexc(front, 0.6), 1, 2)
    o.r(w - 12, T + 10, 5, Z * 0.2, '#e0e0d0'); o.r(w - 12, T + Z * 0.45, 5, Z * 0.3, '#e0e0d0')
    if a.get('lock'):   # BROKE-pilot locked it
        for k in range(6): o.c(w * 0.12 + k * w * 0.15, T + Z * 0.42 + (k % 2) * 4, 5, '#9a9aa2')
        o.r(w / 2 - 9, T + Z * 0.48, 18, 16, '#ffd60a'); o.o(w / 2 - 9, T + Z * 0.48, 18, 16, OUT, 1, 2)
        o.g(w / 2, T + Z * 0.5, 60, '#ff8c28', 0.4)

def p_pillar(o, w, T, Z, R, a):          # concrete column
    box(o, w, T, Z, '#7a7a82', '#5e5e66')
    o.r(0, T + Z * 0.62, w, 8, '#c8b04a', 0.85)
    if a.get('exit'):
        o.r(4, T + 8, w - 8, 16, '#300808'); o.t('EXIT', w / 2, T + 9, 13, '#ff3030', 1, 'A', 'c')
        o.g(w / 2, T + 16, 50, '#ff2020', 0.35)

def p_stairs(o, w, T, Z, R, a):          # concrete stair flight seen from above
    o.r(0, 0, w, T, '#6a6c72')
    steps = max(3, int(w // 26))
    for i in range(steps):
        x = i * w / steps
        o.r(x, 0, w / steps, T, '#73757c' if i % 2 else '#62646a')
        o.l(x, 0, x, T, '#3a3c42', 1, 2)
        o.r(x + 2, 2, 3, T - 4, '#c8b04a', 0.6)                  # yellow nosing
    o.r(0, T, w, Z, '#4c4e54')
    for i in range(steps): o.r(i * w / steps, T + Z - (i + 1) * Z / steps, w / steps, (i + 1) * Z / steps, '#585a60' if i % 2 else '#50525a')
    o.l(0, -6, w, -6, '#c8c8d0', 1, 3)                            # handrail
    o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)

def p_rail(o, w, T, Z, R, a):            # metal railing
    o.r(0, 0, w, T, '#8a8c94'); o.r(0, T, w, Z, '#000000', 0.2)
    o.r(0, T, w, 5, '#a0a2aa')
    for x in range(0, int(w) + 1, 14): o.r(min(x, w - 3), T, 3, Z, '#6a6c74')
    o.r(0, T + Z - 5, w, 5, '#6a6c74')

def p_mailbox(o, w, T, Z, R, a):         # brass mailbox bank
    box(o, w, T, Z, '#6a5a2a', '#8a7432')
    for y in range(int(T) + 6, int(T + Z) - 10, 16):
        for x in range(6, int(w) - 18, 22):
            o.o(x, y, 18, 12, '#4a3a14', 1, 2); o.c(x + 14, y + 6, 2, '#e0c870')


def p_car(o, w, T, Z, R, a):             # parked car
    col = a.get('col', '#3a6ac8')
    vertical = T > w * TILT * 1.1
    o.r(0, 0, w, T, hexc(col, 0.85))
    if vertical:
        o.r(6, T * 0.22, w - 12, T * 0.18, '#1c2430'); o.r(6, T * 0.62, w - 12, T * 0.14, '#1c2430')
        o.r(8, T * 0.4, w - 16, T * 0.22, hexc(col, 1.05))
    else:
        o.r(w * 0.22, 5, w * 0.16, T - 10, '#1c2430'); o.r(w * 0.66, 5, w * 0.12, T - 10, '#1c2430')
        o.r(w * 0.38, 7, w * 0.28, T - 14, hexc(col, 1.05))
    o.r(0, T, w, Z, hexc(col, 0.65))
    o.r(4, T + Z * 0.55, w - 8, 7, '#9aa0a8')
    o.c(10, T + Z * 0.35, 6, '#fff4c0'); o.c(w - 10, T + Z * 0.35, 6, '#fff4c0')
    if a.get('lights'): o.g(10, T + Z * 0.35, 60, '#fff4c0', 0.4); o.g(w - 10, T + Z * 0.35, 60, '#fff4c0', 0.4)
    o.r(w / 2 - 14, T + Z * 0.3, 28, 10, '#e8e8e8')
    o.r(6, T + Z - 10, 18, 10, '#111111'); o.r(w - 24, T + Z - 10, 18, 10, '#111111')
    o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)


def p_corn(o, w, T, Z, R, a):            # a row of corn
    seed = int(w * 7 + T * 3)
    o.r(0, 0, w, T, '#2e5a1e'); o.n(0, 0, w, T, w * T / 25, '#4a8a2a', 0.6, 1, 4, 10, seed); o.n(0, 0, w, T, w * T / 60, '#1c3a12', 0.6, 1, 3, 8, seed + 1)
    o.r(0, T, w, Z, '#1e3a14')
    rr = random.Random(seed)
    x = 3
    while x < w - 3:
        o.l(x, T, x, T + Z, '#5a8a30', 1, 3)
        if rr.random() < 0.45: o.e(x + 3, T + Z * rr.uniform(0.35, 0.6), 3, 8, '#e0c050')
        o.l(x, T + Z * 0.3, x + 9, T + Z * 0.2, '#4a7a28', 1, 2)
        x += rr.uniform(8, 13)
    o.r(0, T + Z - 6, w, 6, '#2a2014')
    o.r(0, 0, w, 3, '#8ac850', 0.35)

def p_bale(o, w, T, Z, R, a):            # round hay bale
    o.e(w / 2, T / 2, w / 2, T / 2, '#c8a050'); o.n(4, 4, w - 8, T - 8, w * T / 40, '#a07a30', 0.5, 1, 2, 5, int(w))
    o.r(0, T / 2, w, Z, '#b08a40')
    o.e(w / 2, T / 2 + Z, w / 2, T / 2, '#b08a40')
    for k in (0.85, 0.6, 0.35): o.e(w / 2, T / 2 + Z * 0.6, w / 2 * k, Z * 0.4 * k, '#8a6a28', 0.45)


def p_hay(o, w, T, Z, R, a):             # square bale
    box(o, w, T, Z, '#d8b860', '#c0a048')
    o.n(2, 2, w - 4, T + Z - 4, w * (T + Z) / 50, '#8a6a28', 0.5, 1, 2, 6, int(w * 3 + T))
    for k in (0.3, 0.7): o.l(w * k, 0, w * k, T + Z, '#6a4a20', 1, 2)

def p_stall(o, w, T, Z, R, a):           # wooden stall fence
    o.r(0, 0, w, T, '#6a4426')
    o.r(0, T, w, Z, '#000000', 0.25)
    for k in (0.15, 0.5, 0.82): o.r(0, T + Z * k - 5, w, 10, '#8a5a32'); o.l(0, T + Z * k - 5, w, T + Z * k - 5, '#a8784a', 1, 2)
    for x in range(0, int(w), 60): o.r(x, T, 10, Z, '#5a3820')
    o.r(w - 10, T, 10, Z, '#5a3820')
    o.o(0, 0, w, T, OUT, 1, 3)

def p_tractor(o, w, T, Z, R, a):         # red farm tractor (no brand)
    o.r(0, 0, w, T, '#9a2a20'); o.r(w * 0.55, T * 0.15, w * 0.3, T * 0.7, '#2a2a2a')
    o.c(w * 0.7, T * 0.5, T * 0.2, '#1a1a1a'); o.r(w * 0.1, T * 0.2, w * 0.4, T * 0.6, '#b8362a')
    o.r(0, T, w, Z, '#7a1e18')
    o.r(w * 0.08, T + 6, w * 0.3, Z * 0.4, '#3a3a40')
    for y in range(int(T) + 10, int(T + Z * 0.4), 6): o.l(w * 0.1, y, w * 0.36, y, '#1a1a1a', 1, 2)
    o.c(w * 0.78, T + Z * 0.55, Z * 0.48, '#151515'); o.c(w * 0.78, T + Z * 0.55, Z * 0.2, '#c8a020')
    o.c(w * 0.2, T + Z * 0.75, Z * 0.26, '#151515'); o.c(w * 0.2, T + Z * 0.75, Z * 0.1, '#c8a020')
    o.o(0, 0, w, T, OUT, 1, 3)

def p_rig(o, w, T, Z, R, a):             # the 5-helmet dream rig
    o.r(0, 0, w, T, '#22222c'); o.o(6, 6, w - 12, T - 12, '#00e6ff', 0.8, 2)
    for i in range(5):
        ang = -math.pi / 2 + i * 2 * math.pi / 5
        x, y = w / 2 + math.cos(ang) * w * 0.32, T / 2 + math.sin(ang) * T * 0.32
        o.c(x, y, 13, '#d8dde4'); o.c(x, y, 9, '#9aa4b0'); o.r(x - 10, y - 2, 20, 4, '#00e6ff')
        o.l(x, y, w / 2, T / 2, '#00e6ff', 0.5, 2)
    o.c(w / 2, T / 2, 10, '#00e6ff'); o.g(w / 2, T / 2, w * 0.6, '#00e6ff', 0.35)
    o.r(0, T, w, Z, '#16161e')
    o.r(6, T + Z * 0.3, w - 12, 5, '#00e6ff'); o.g(w / 2, T + Z * 0.32, w * 0.5, '#00e6ff', 0.3)
    o.t('DEEPER', w / 2, T + Z * 0.45, 24, '#8232dc', 1, 'A', 'c')
    o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)

def p_glitch(o, w, T, Z, R, a):          # dream glitch pillar
    box(o, w, T, Z, '#1c1030', '#120a22')
    for y in range(int(T) + 4, int(T + Z), 9): o.r(2, y, w - 4, 3, '#00e6ff' if (y // 9) % 3 else '#8232dc', 0.55)
    o.g(w / 2, T + Z / 2, 90, '#8232dc', 0.3)


# ---- props for the real Ep3-5 locations
def p_hwall(o, w, T, Z, R, a):           # house drywall, painted, with baseboard
    col = a.get('col', '#d8ccb0')
    box(o, w, T, Z, hexc(col, 0.55), col)
    o.r(0, T + Z - 10, w, 10, '#f4f0e8'); o.l(0, T + Z - 10, w, T + Z - 10, '#8a8070', 1, 2)
    if a.get('frames') and w > 120:
        for x in range(30, int(w) - 60, 150): o.r(x, T + Z * 0.2, 44, 34, '#3a2a1a'); o.r(x + 4, T + Z * 0.2 + 4, 36, 26, a['frames'])

def p_bed(o, w, T, Z, R, a):
    col = a.get('col', '#2e3c6e')
    o.r(0, 0, w, T, '#5a3a22'); o.r(4, T * 0.22, w - 8, T * 0.76, col)
    o.r(8, 6, w * 0.42, T * 0.16, '#f0f0f8'); o.r(w * 0.54, 6, w * 0.38, T * 0.16, '#f0f0f8')
    o.l(4, T * 0.5, w - 4, T * 0.5, hexc(col, 0.75), 1, 3)
    o.r(0, T, w, Z, hexc(col, 0.8)); o.r(0, T + Z - 8, w, 8, '#3a2412')
    o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)

def p_night(o, w, T, Z, R, a):           # nightstand with the 7:00 alarm clock
    box(o, w, T, Z, '#6a4426', '#5a3820')
    o.r(w * 0.2, T * 0.2, w * 0.6, T * 0.55, '#1c1c26'); o.t('7:00', w / 2, T * 0.18, 13, '#ff4646', 1, 'A', 'c')
    o.g(w / 2, T * 0.45, 40, '#ff3030', 0.3)
    o.r(w / 2 - 6, T + Z * 0.4, 12, 4, '#c8a050')

def p_desk(o, w, T, Z, R, a):            # desk with an open laptop
    o.r(0, 0, w, T, '#8a6a48'); o.r(0, T, w, 10, '#6a4a2c'); o.r(0, T + 10, w, Z - 10, '#000000', 0.35)
    for x in (4, w - 14): o.r(x, T + 10, 10, Z - 10, '#4a3018')
    lx = w * 0.3
    o.r(lx, 4, w * 0.4, T * 0.45, '#2a2a30'); o.r(lx + 4, 7, w * 0.4 - 8, T * 0.45 - 6, a.get('screen', '#6e24c8'))
    o.t(a.get('text', 'ZEV DOD'), lx + w * 0.2, 9, 11, '#ffd60a', 1, 'A', 'c')
    o.g(lx + w * 0.2, T * 0.25, 70, a.get('screen', '#6e24c8'), 0.35)
    o.r(lx, T * 0.5, w * 0.4, T * 0.28, '#3a3a42')
    if a.get('mug'): o.c(w * 0.85, T * 0.5, 7, '#e8e8e8'); o.c(w * 0.85, T * 0.5, 4, '#4a2a12')
    o.o(0, 0, w, T, OUT, 1, 3)

def p_tv(o, w, T, Z, R, a):              # flat TV on a low console
    box(o, w, T, Z * 0.45, '#2a1e16', '#3a2a1e')
    o.r(w * 0.06, -Z * 0.55 + T, w * 0.88, Z * 0.9, '#101014'); o.o(w * 0.06, -Z * 0.55 + T, w * 0.88, Z * 0.9, OUT, 1, 3)
    sx, sy, sw, sh = w * 0.09, -Z * 0.55 + T + 4, w * 0.82, Z * 0.9 - 8
    if a.get('glitch'):
        o.r(sx, sy, sw, sh, '#2a0c3a')
        for k in range(6): o.r(sx, sy + k * sh / 6, sw, 3, '#ff8c28' if k % 2 else '#8232dc', 0.7)
        o.t('F', sx + sw / 2, sy + 2, int(sh * 0.8), '#ff3030', 1, 'A', 'c')
        o.g(w / 2, sy + sh / 2, w * 0.9, '#ff8c28', 0.35)
    else:
        o.r(sx, sy, sw, sh, '#3a6ac8'); o.r(sx, sy, sw, sh * 0.4, '#8ab4ff', 0.4)
        o.g(w / 2, sy + sh / 2, w * 0.8, '#8ab4ff', 0.3)

def p_shelf(o, w, T, Z, R, a):           # bookshelf / dresser
    box(o, w, T, Z, '#5a3a22', '#6a4628')
    rr = random.Random(int(w * 13 + Z))
    for k in range(3):
        y = T + 6 + k * (Z - 12) / 3
        o.r(4, y + (Z - 12) / 3 - 4, w - 8, 4, '#3a2412')
        x = 6
        while x < w - 10:
            bw = rr.uniform(6, 12)
            o.r(x, y + 4, bw, (Z - 12) / 3 - 9, rr.choice(['#c83a3a', '#3a6ac8', '#e8c040', '#3a8a5a', '#8a3ac8', '#e8e0c8']))
            x += bw + 2

def p_shed(o, w, T, Z, R, a):            # backyard shed
    o.r(0, 0, w, T, '#5a4a3a'); 
    for x in range(0, int(w), 16): o.l(x, 0, x, T, '#3a2e22', 1, 2)
    o.r(0, T, w, Z, '#8a3a2a')
    for x in range(0, int(w), 18): o.l(x, T, x, T + Z, '#6a2a1e', 1, 2)
    o.r(w * 0.35, T + Z * 0.25, w * 0.3, Z * 0.75, '#5a2418'); o.l(w * 0.35, T + Z * 0.25, w * 0.65, T + Z, '#e8e0c8', 1, 3); o.l(w * 0.65, T + Z * 0.25, w * 0.35, T + Z, '#e8e0c8', 1, 3)
    o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)

def p_grill(o, w, T, Z, R, a):
    o.e(w / 2, T / 2, w / 2, T / 2, '#1a1a1e'); o.e(w / 2, T / 2, w / 2 - 5, T / 2 - 4, '#3a3a40')
    for k in range(-2, 3): o.l(w / 2 + k * w / 7, 4, w / 2 + k * w / 7, T - 4, '#8a8a90', 1, 2)
    o.r(w / 2 - 3, T / 2, 6, Z, '#2a2a30'); o.r(w * 0.2, T / 2 + Z - 4, w * 0.6, 4, '#2a2a30')

def p_glass(o, w, T, Z, R, a):           # lobby glass front with steel mullions
    o.r(0, 0, w, T, '#5a6a78')
    o.r(0, T, w, Z, '#9ad0ff', 0.28)
    for x in range(0, int(w) + 1, 60): o.r(min(x, w - 6), T, 6, Z, '#6a7480')
    o.r(0, T, w, 6, '#6a7480'); o.r(0, T + Z - 8, w, 8, '#4a5460')
    o.l(10, T + 10, 40, T + Z - 20, '#ffffff', 0.35, 3)

def p_plant(o, w, T, Z, R, a):           # lobby planter
    o.r(0, T * 0.35, w, T * 0.65, '#3a3a42'); o.r(0, T, w, Z * 0.55, '#4a4a52'); o.o(0, T * 0.35, w, T * 0.65 + Z * 0.55, OUT, 1, 3)
    for k, (dx, dy, r) in enumerate([(0.5, -0.2, 0.42), (0.25, 0.1, 0.32), (0.75, 0.05, 0.32), (0.5, 0.3, 0.3)]):
        o.c(w * dx, T * dy, w * r, '#2e6a2a' if k % 2 else '#3a8a34')

def p_elevator(o, w, T, Z, R, a):        # two steel elevator doors
    box(o, w, T, Z, '#4a4a52', '#7a7e86')
    for k in range(2):
        x = w * (0.08 + k * 0.5)
        o.r(x, T + Z * 0.15, w * 0.36, Z * 0.85, '#a8acb4'); o.l(x + w * 0.18, T + Z * 0.15, x + w * 0.18, T + Z, '#5a5e66', 1, 2)
        o.r(x + w * 0.12, T + 4, w * 0.12, Z * 0.09, '#1a1a1e'); o.t(str(8 if k else 1), x + w * 0.18, T + 3, 10, '#ff8c28', 1, 'P', 'c')

def p_fdesk(o, w, T, Z, R, a):           # lobby front desk
    box(o, w, T, Z, '#e8e4dc', '#3a3a44')
    o.r(0, T + Z * 0.3, w, 6, '#ffd60a', 0.8)
    o.t(a.get('text', 'BUILDING 8'), w / 2, T + Z * 0.42, 14, '#e8e4dc', 1, 'A', 'c')

def p_bench(o, w, T, Z, R, a):           # garage workbench with tools
    o.r(0, 0, w, T, '#8a6a40'); o.r(0, T, w, Z, '#5a5e66')
    for x in range(6, int(w) - 30, 50): o.o(x, T + 6, 44, Z - 12, '#3a3e46', 1, 2); o.r(x + 18, T + 10, 8, 4, '#c8c8c8')
    o.r(w * 0.1, 4, 30, 8, '#c83a3a'); o.r(w * 0.5, 6, 40, 6, '#8a8a92'); o.c(w * 0.8, T / 2, 6, '#ffd60a')
    o.o(0, 0, w, T, OUT, 1, 3); o.o(0, T, w, Z, OUT, 1, 3)

PROPS = {
    'wall': (p_wall, 100), 'brick': (p_brick, 104), 'couch': (p_couch, 44), 'crt': (p_crt, 70),
    'counter': (p_counter, 60), 'table': (p_table, 36), 'fridge': (p_fridge, 112),
    'pillar': (p_pillar, 140), 'stairs': (p_stairs, 46), 'rail': (p_rail, 50), 'mailbox': (p_mailbox, 92),
    'car': (p_car, 52),
    'corn': (p_corn, 104), 'bale': (p_bale, 58),
    'hay': (p_hay, 54), 'stall': (p_stall, 64), 'tractor': (p_tractor, 84), 'rig': (p_rig, 70),
    'glitch': (p_glitch, 130),
    'hwall': (p_hwall, 100), 'bed': (p_bed, 40), 'night': (p_night, 50), 'desk': (p_desk, 56), 'tv': (p_tv, 74), 'shelf': (p_shelf, 116),
    'shed': (p_shed, 110), 'grill': (p_grill, 60), 'glass': (p_glass, 120), 'plant': (p_plant, 70), 'elevator': (p_elevator, 130),
    'fdesk': (p_fdesk, 64), 'bench': (p_bench, 62),
}

# ---------------------------------------------------------------- floors
def f_shag(o, x, y, w, h, col='#c4621e', seed=1):
    o.r(x, y, w, h, col)
    o.n(x, y, w, h, w * h / 260, hexc(col, 0.72), 0.5, 0.9, 2, 5, seed)
    o.n(x, y, w, h, w * h / 520, hexc(col, 1.25), 0.4, 0.8, 2, 4, seed + 1)

def f_lino(o, x, y, w, h, a='#d8ccb0', b='#8a3a2a'):
    o.r(x, y, w, h, a)
    for yy in range(int(y), int(y + h), 60):
        for xx in range(int(x), int(x + w), 60):
            if ((xx - x) // 60 + (yy - y) // 60) % 2: o.r(xx, yy, min(60, x + w - xx), min(60, y + h - yy), b)

def f_carpet(o, x, y, w, h):
    o.r(x, y, w, h, '#2f4a3a'); o.n(x, y, w, h, w * h / 300, '#1e3428', 0.5, 0.9, 2, 4, 9)
    for yy in (y + 14, y + h - 22): o.r(x, yy, w, 8, '#a8843a', 0.8)
    for xx in range(int(x), int(x + w), 40): o.r(xx + 10, y + 16, 12, 4, '#2f4a3a'); o.r(xx + 10, y + h - 20, 12, 4, '#2f4a3a')

def f_concrete(o, x, y, w, h, col='#3e4148', seed=4):
    o.r(x, y, w, h, col)
    for yy in range(int(y), int(y + h), 120): o.l(x, yy, x + w, yy, '#22242a', 0.8, 2)
    for xx in range(int(x), int(x + w), 160): o.l(xx, y, xx, y + h, '#22242a', 0.8, 2)
    o.n(x, y, w, h, w * h / 700, '#1a1c20', 0.2, 0.45, 2, 7, seed)

def f_tile(o, x, y, w, h):               # lobby terrazzo
    o.r(x, y, w, h, '#5c5664')
    o.n(x, y, w, h, w * h / 400, '#8a8494', 0.5, 0.9, 1, 3, 12); o.n(x, y, w, h, w * h / 900, '#c8a060', 0.4, 0.8, 1, 3, 13)
    for yy in range(int(y), int(y + h), 80): o.l(x, yy, x + w, yy, '#3a3640', 0.7, 2)
    for xx in range(int(x), int(x + w), 80): o.l(xx, y, xx, y + h, '#3a3640', 0.7, 2)

def f_asphalt(o, x, y, w, h, seed=5):
    o.r(x, y, w, h, '#2a2a30')
    o.n(x, y, w, h, w * h / 220, '#3a3a42', 0.4, 0.8, 1, 3, seed); o.n(x, y, w, h, w * h / 900, '#18181c', 0.4, 0.8, 3, 9, seed + 1)


def f_field(o, x, y, w, h):
    o.r(x, y, w, h, '#2e2418')
    for yy in range(int(y), int(y + h), 26): o.l(x, yy, x + w, yy, '#20180e', 0.8, 4)
    o.n(x, y, w, h, w * h / 500, '#4a3a22', 0.4, 0.8, 2, 5, 21)


def f_planks(o, x, y, w, h):
    o.r(x, y, w, h, '#6a4a2a')
    rr = random.Random(41)
    for yy in range(int(y), int(y + h), 24):
        c = ['#6a4a2a', '#5e4024', '#74522e', '#634526'][rr.randint(0, 3)]
        o.r(x, yy, w, 23, c); o.l(x, yy, x + w, yy, '#3a2614', 0.8, 2)
        xx = x + rr.uniform(0, 200)
        while xx < x + w:
            o.l(xx, yy, xx, yy + 23, '#3a2614', 0.7, 2); xx += rr.uniform(180, 320)
    o.n(x, y, w, h, w * h / 450, '#d8b860', 0.4, 0.8, 3, 9, 42)       # loose straw

def f_grass(o, x, y, w, h):
    o.r(x, y, w, h, '#24401c'); o.n(x, y, w, h, w * h / 160, '#3a6a2a', 0.4, 0.9, 2, 5, 51)

def f_wood(o, x, y, w, h, col='#b08458', seed=61):
    o.r(x, y, w, h, col)
    rr = random.Random(seed)
    for yy in range(int(y), int(y + h), 20):
        o.r(x, yy, w, 19, hexc(col, rr.uniform(0.86, 1.06))); o.l(x, yy, x + w, yy, hexc(col, 0.6), 0.6, 1)
        xx = x + rr.uniform(0, 160)
        while xx < x + w: o.l(xx, yy, xx, yy + 19, hexc(col, 0.6), 0.6, 1); xx += rr.uniform(140, 260)

def f_sidewalk(o, x, y, w, h):
    o.r(x, y, w, h, '#8a8a86')
    for yy in range(int(y), int(y + h), 90): o.l(x, yy, x + w, yy, '#5e5e5a', 0.8, 2)
    o.n(x, y, w, h, w * h / 500, '#6e6e6a', 0.4, 0.8, 2, 5, 71)

FLOORS = {'wood': f_wood, 'sidewalk': f_sidewalk, 'shag': f_shag, 'lino': f_lino, 'carpet': f_carpet, 'concrete': f_concrete, 'tile': f_tile, 'asphalt': f_asphalt,
          'field': f_field, 'planks': f_planks, 'grass': f_grass}


# ---------------------------------------------------------------- arena building
class Arena:
    def __init__(self, aid, name, base, shade=1.0, dark=0.0):
        self.id, self.name, self.shade, self.dark = aid, name, shade, dark
        self.pieces, self.zones, self.decals = [], [], Ops()
        self.decals.shade = shade
        self.base = base
    def piece(self, x, y, w, h, kind, mirror=True, **attrs):
        self.pieces.append(dict(x=x, y=y, w=w, h=h, kind=kind, a=attrs))
        if mirror:
            m = dict(attrs)
            if 'mcol' in attrs: m['col'] = attrs['mcol']
            self.pieces.append(dict(x=W - x - w, y=y, w=w, h=h, kind=kind, a=m))
    def zone(self, x, y, w, h, kind, mirror=True, **kw):
        self.zones.append((x, y, w, h, kind, kw))
        if mirror: self.zones.append((W - x - w, y, w, h, kind, kw))

    # grid + reachability exactly like the games
    def check(self):
        solid = [p for p in self.pieces]
        GC, GR = math.ceil(W / CELL), math.ceil(H / CELL)
        block = [[0] * GC for _ in range(GR)]
        for r in range(GR):
            for c in range(GC):
                x, y = c * CELL + CELL / 2, r * CELL + CELL / 2
                if x < INFL or y < INFL or x > W - INFL or y > H - INFL: block[r][c] = 1; continue
                for w in solid:
                    if w['x'] - INFL < x < w['x'] + w['w'] + INFL and w['y'] - INFL < y < w['y'] + w['h'] + INFL: block[r][c] = 1; break
        def sp(team, i): return (120 if team == 'P' else W - 120, int(H * (i + 1) / 6 + 0.5))
        s = sp('P', 2); start = (s[1] // CELL, s[0] // CELL)
        bad = []
        for team in 'PB':
            for i in range(5):
                x, y = sp(team, i)
                if block[y // CELL][x // CELL]: bad.append(('spawn blocked', team, i, x, y))
        if block[start[0]][start[1]]: return 0, bad + ['start blocked']
        seen = {start}; q = [start]
        while q:
            r, c = q.pop()
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                rr, cc = r + dr, c + dc
                if 0 <= rr < GR and 0 <= cc < GC and not block[rr][cc] and (rr, cc) not in seen: seen.add((rr, cc)); q.append((rr, cc))
        free = sum(1 for r in range(GR) for c in range(GC) if not block[r][c])
        for team in 'PB':
            for i in range(5):
                x, y = sp(team, i)
                if (y // CELL, x // CELL) not in seen: bad.append(('spawn cut off', team, i))
        self.block = block
        return len(seen) / max(1, free), bad

    def export(self):
        floor = Ops(); floor.shade = self.shade
        FLOORS[self.base[0]](floor, 0, 0, W, H, *self.base[1:])
        for (x, y, w, h, kind, kw) in self.zones: FLOORS[kind](floor, x, y, w, h, **kw)
        floor.extend(self.decals)
        # props
        pieces = []
        for p in self.pieces:
            fn, z = PROPS[p['kind']]
            z = p['a'].get('z', z)
            T = max(6, round(p['h'] * TILT))
            o = Ops(); o.shade = self.shade
            fn(o, p['w'], T, z, None, p['a'])
            pieces.append(dict(x=p['x'], y=p['y'], w=p['w'], h=p['h'], kind=p['kind'], z=z, ops=o))
        return dict(id=self.id, name=self.name, w=W, h=H, dark=self.dark, floor=floor, pieces=pieces)


def apt():      # Ch1 "WTF": Building 8, 14th floor, Chicago 1987
    A = Arena('apt14', 'BUILDING 8 ' + '•' + ' 14TH FLOOR', ('shag', '#c4621e', 1))
    # hallway with doors, apartments above and below
    A.zone(0, 600, 1200, 240, 'carpet')
    A.zone(600, 0, 600, 570, 'lino')
    A.zone(0, 870, 640, 570, 'shag', col='#9a4a1c', seed=3)
    A.zone(640, 870, 560, 570, 'lino', a='#c8c0a0', b='#3a5a7a')
    for x0, x1 in ((0, 380), (500, 860), (980, 1185)): A.piece(x0, 570, x1 - x0, 30, 'wall')
    for x0, x1 in ((0, 260), (380, 900), (1020, 1185)): A.piece(x0, 840, x1 - x0, 30, 'wall')
    A.piece(1185, 570, 30, 30, 'wall', mirror=False); A.piece(1185, 840, 30, 30, 'wall', mirror=False)
    A.piece(600, 0, 30, 290, 'wall'); A.piece(600, 410, 30, 160, 'wall')                        # living room | kitchen
    A.piece(640, 870, 30, 150, 'wall'); A.piece(640, 1140, 30, 300, 'wall')
    A.piece(1185, 0, 30, 230, 'wall', mirror=False); A.piece(1185, 350, 30, 220, 'wall', mirror=False)   # between apartments
    A.piece(1185, 870, 30, 210, 'wall', mirror=False); A.piece(1185, 1200, 30, 240, 'wall', mirror=False)
    # Perci's living room: plaid couch facing the CRT, coffee table
    A.piece(250, 380, 210, 70, 'couch', col='#8a3428', mcol='#3a4a8a')
    A.piece(300, 130, 90, 50, 'crt')
    A.piece(300, 250, 90, 50, 'table')
    # kitchen
    A.piece(700, 40, 300, 50, 'counter'); A.piece(1080, 40, 60, 60, 'fridge')
    A.piece(820, 300, 110, 80, 'table')
    # downstairs neighbour
    A.piece(260, 1140, 210, 70, 'couch', col='#4a6a3a', mcol='#6a3a5a')
    A.piece(310, 1330, 90, 50, 'crt')
    A.piece(760, 1340, 280, 50, 'counter'); A.piece(860, 1050, 110, 80, 'table')
    A.piece(760, 690, 40, 60, 'pillar', z=100)                                                    # hallway cover
    d = A.decals
    d.t('BUILDING 8', 1200, 660, 70, '#e8d8a0', 0.10, 'A', 'c')
    d.t('14', 1200, 740, 50, '#e8d8a0', 0.10, 'A', 'c')
    d.r(130, 420, 100, 70, '#2a3a8a', 0.5); d.r(130, 438, 100, 8, '#ffffff', 0.5); d.r(130, 456, 100, 8, '#ffffff', 0.5)  # Chicago-flag rug
    for x in (165, 195): d.c(x, 452, 4, '#e03030', 0.9)
    d.g(345, 200, 220, '#8ab4ff', 0.18)                                                         # TV glow
    return A

def stairs():   # Ch2 "LOG OUT": Building 8 stairwell, lobby, lights out
    A = Arena('stair8', 'BUILDING 8 ' + '•' + ' STAIRWELL & LOBBY', ('concrete',), shade=0.85, dark=0.18)
    A.zone(840, 300, 360, 840, 'tile')
    A.piece(300, 0, 30, 470, 'brick'); A.piece(300, 970, 30, 470, 'brick')
    A.piece(420, 90, 260, 90, 'stairs'); A.piece(420, 1260, 260, 90, 'stairs')
    A.piece(420, 230, 260, 16, 'rail'); A.piece(420, 1194, 260, 16, 'rail')
    A.piece(560, 560, 30, 320, 'brick')
    A.piece(760, 380, 60, 60, 'pillar', exit=True); A.piece(760, 1000, 60, 60, 'pillar')
    A.piece(1080, 60, 240, 50, 'mailbox', mirror=False); A.piece(1080, 1330, 240, 50, 'mailbox', mirror=False)
    A.piece(990, 600, 50, 50, 'pillar'); A.piece(990, 790, 50, 50, 'pillar')
    A.piece(1170, 640, 60, 160, 'pillar', mirror=False, exit=True)
    d = A.decals
    for x, y in ((150, 700), (2250, 700)):
        d.g(x, y, 160, '#ff2020', 0.25); d.t('EXIT', x, y - 30, 40, '#ff3030', 0.35, 'A', 'c')
    for x, y in ((700, 300), (1700, 300), (700, 1140), (1700, 1140), (1200, 720)): d.g(x, y, 260, '#c8d0ff', 0.12)   # flashlight pools
    d.t('8', 1200, 330, 160, '#c8b04a', 0.12, 'A', 'c')
    d.t('LOBBY', 1200, 1020, 50, '#e8d8a0', 0.10, 'A', 'c')
    return A

def phouse():   # Ch3 "WAKE UP": Perci's house in small-town Nebraska, bots come in from the backyard cornfield
    A = Arena('phouse', "PERCI'S HOUSE " + '\u2022' + ' NEBRASKA', ('grass',))
    A.zone(0, 0, 1500, 1440, 'wood', mirror=False)
    A.zone(0, 0, 620, 820, 'shag', mirror=False, col='#a8987a', seed=8)            # bedroom carpet
    A.zone(650, 0, 850, 820, 'lino', mirror=False, a='#e8e4dc', b='#b8c0c8')         # kitchen
    A.zone(1530, 560, 260, 320, 'wood', mirror=False, col='#8a6a48', seed=62)       # back porch deck
    A.zone(1990, 0, 410, 1440, 'field', mirror=False)                                # cornfield edge
    hw = dict(mirror=False, col='#d8ccb0')
    A.piece(620, 0, 30, 220, 'hwall', **hw); A.piece(620, 360, 30, 460, 'hwall', **hw)            # bedroom | kitchen
    for x0, x1 in ((0, 240), (380, 900), (1040, 1500)): A.piece(x0, 820, x1 - x0, 30, 'hwall', frames='#7fa8c8', **hw)
    for y0, y1 in ((0, 180), (320, 640), (800, 1080), (1220, 1440)): A.piece(1500, y0, 30, y1 - y0, 'hwall', **hw)   # back wall + doors
    # bedroom: the bed he woke up in, the 7:00 alarm, dresser
    A.piece(300, 60, 170, 210, 'bed', mirror=False); A.piece(490, 60, 50, 50, 'night', mirror=False)
    A.piece(260, 640, 200, 50, 'shelf', mirror=False)
    # kitchen: the empty fridge, counter, table
    A.piece(700, 30, 420, 50, 'counter', mirror=False); A.piece(1160, 30, 70, 60, 'fridge', mirror=False, style='white')
    A.piece(900, 420, 160, 100, 'table', mirror=False)
    # living room: THE couch, TV, coffee table, the ZEV DOD laptop desk
    A.piece(300, 1060, 230, 74, 'couch', mirror=False, col='#5a4a6a')
    A.piece(340, 1350, 160, 40, 'tv', mirror=False)
    A.piece(350, 1210, 120, 50, 'table', mirror=False)
    A.piece(900, 1180, 180, 70, 'desk', mirror=False, mug=True)
    A.piece(1200, 900, 200, 50, 'shelf', mirror=False)
    # backyard
    A.piece(1640, 200, 170, 120, 'shed', mirror=False); A.piece(1640, 980, 50, 50, 'grill', mirror=False)
    for y in (100, 340, 580, 820, 1060, 1300): A.piece(2020, y, 220, 40, 'corn', mirror=False)
    d = A.decals
    d.l(560, 1180, 620, 1100, '#b8b8c0', 0.9, 6); d.l(575, 1185, 635, 1105, '#b8b8c0', 0.9, 6)      # crutches on the floor
    d.r(260, 300, 120, 70, '#c8a060', 0.35)                                                           # rug by the bed
    d.g(420, 1300, 260, '#8ab4ff', 0.12); d.g(990, 1200, 200, '#8232dc', 0.18)
    d.t('NEBRASKA', 1800, 1340, 40, '#e8e0c8', 0.12, 'A', 'c')
    return A

def mhouse():   # Ch4 "5150": Miracle's house in Lincoln after BROKE-pilot takes it over; bots pour out of the garage
    A = Arena('mhouse', "MIRACLE'S HOUSE " + '\u2022' + ' LINCOLN', ('wood', '#9a7048', 63), shade=0.95)
    A.zone(900, 0, 800, 820, 'lino', mirror=False, a='#f0f0ec', b='#d8d8d4')      # kitchen
    A.zone(0, 850, 700, 590, 'shag', mirror=False, col='#7a5aa8', seed=14)         # Miracle's room, purple carpet
    A.zone(730, 850, 970, 590, 'shag', mirror=False, col='#7a7a72', seed=15)       # mom's office
    A.zone(1730, 0, 670, 1440, 'concrete', mirror=False)                           # garage
    hw = dict(mirror=False, col='#e4dccc')
    for x0, x1 in ((0, 300), (440, 1100), (1240, 1700)): A.piece(x0, 820, x1 - x0, 30, 'hwall', frames='#c8a0e8', **hw)
    A.piece(700, 850, 30, 140, 'hwall', **hw); A.piece(700, 1110, 30, 330, 'hwall', **hw)
    A.piece(900, 0, 30, 240, 'hwall', **hw); A.piece(900, 400, 30, 420, 'hwall', **hw)
    for y0, y1 in ((0, 300), (420, 1000), (1120, 1440)): A.piece(1700, y0, 30, y1 - y0, 'hwall', **hw)
    # living room: the TV grading everything, couch
    A.piece(340, 40, 200, 40, 'tv', mirror=False, glitch=True)
    A.piece(300, 330, 260, 80, 'couch', mirror=False, col='#5a5a6a')
    A.piece(370, 200, 120, 50, 'table', mirror=False)
    # kitchen: the locked fridge, island, counter
    A.piece(1500, 30, 80, 70, 'fridge', mirror=False, style='steel', lock=True)
    A.piece(1000, 30, 440, 50, 'counter', mirror=False)
    A.piece(1100, 380, 300, 80, 'counter', mirror=False)
    # Miracle's room: bed, desk with the BROKE-pilot app
    A.piece(300, 1200, 160, 200, 'bed', mirror=False, col='#6e24c8')
    A.piece(300, 920, 200, 70, 'desk', mirror=False, screen='#ff8c28', text='BROKE-PILOT')
    # mom's office: Monroe Realty desk, shelves
    A.piece(1100, 1050, 220, 80, 'desk', mirror=False, screen='#3a6ac8', text='MONROE REALTY', mug=True)
    A.piece(1300, 1370, 300, 50, 'shelf', mirror=False); A.piece(800, 1370, 220, 50, 'shelf', mirror=False)
    # garage: Tod's car, workbench
    A.piece(1950, 380, 120, 230, 'car', mirror=False, col='#e8e8e8'); A.piece(1950, 860, 120, 230, 'car', mirror=False, col='#3a3a44')
    A.piece(1800, 30, 360, 50, 'bench', mirror=False)
    d = A.decals
    rr = random.Random(4)
    for x, y in ((600, 600), (1300, 650), (500, 1100), (1500, 1250), (250, 700)):    # robot vacuums gone rogue
        d.c(x, y, 22, '#2a2a30', 0.9); d.c(x, y, 8, '#ff8c28', 0.9); d.g(x, y, 70, '#ff8c28', 0.3)
    for x, y, c in ((450, 450, '#8232dc'), (300, 650, '#ff3cc8'), (650, 300, '#00e6ff')):  # BROKE-pilot disco lights
        d.g(x, y, 260, c, 0.18)
    d.g(440, 100, 300, '#ff8c28', 0.2)
    d.t('A+', 1280, 1180, 60, '#3fe0d8', 0.15, 'A', 'c')
    d.r(1730, 1300, 670, 20, '#ffd60a', 0.4)
    return A

def b8lincoln(): # Ch5 "PICK UP": Building 8 in Lincoln at night: the car at the curb, the lobby, the stairs
    A = Arena('b8lincoln', 'BUILDING 8 ' + '\u2022' + ' LINCOLN', ('asphalt',), shade=0.9)
    A.zone(420, 0, 220, 1440, 'sidewalk', mirror=False)
    A.zone(670, 0, 1030, 1440, 'tile', mirror=False)
    A.zone(1730, 0, 670, 1440, 'concrete', mirror=False)
    for y0, y1 in ((0, 300), (460, 980), (1140, 1440)): A.piece(640, y0, 30, y1 - y0, 'glass', mirror=False)
    for y0, y1 in ((0, 220), (340, 660), (780, 1100), (1220, 1440)): A.piece(1700, y0, 30, y1 - y0, 'brick', mirror=False)
    # Perci's car at the curb, hazards on
    A.piece(230, 620, 100, 190, 'car', mirror=False, col='#2a4a6a', lights=True)
    # lobby
    A.piece(900, 30, 300, 50, 'mailbox', mirror=False); A.piece(1300, 30, 300, 70, 'elevator', mirror=False)
    A.piece(1080, 560, 80, 300, 'fdesk', mirror=False)
    A.piece(740, 160, 60, 60, 'plant', mirror=False); A.piece(740, 1220, 60, 60, 'plant', mirror=False)
    A.piece(1400, 520, 60, 60, 'pillar', mirror=False); A.piece(1400, 860, 60, 60, 'pillar', mirror=False)
    A.piece(1250, 1250, 220, 70, 'couch', mirror=False, col='#3a3a4a')
    # stairwell
    A.piece(1850, 120, 260, 90, 'stairs', mirror=False); A.piece(1850, 1230, 260, 90, 'stairs', mirror=False)
    A.piece(1850, 250, 260, 16, 'rail', mirror=False); A.piece(1850, 1190, 260, 16, 'rail', mirror=False)
    A.piece(1960, 620, 60, 200, 'pillar', mirror=False, exit=True)
    d = A.decals
    d.r(410, 0, 10, 1440, '#c8c8c0', 0.8)                                       # curb
    for y in range(40, 1440, 140): d.r(150, y, 8, 70, '#e8e8e8', 0.5)
    for x, y in ((230, 610), (330, 610)): d.g(x, y, 70, '#ff8c28', 0.5)          # hazard lights
    d.g(280, 830, 260, '#fff4c0', 0.15)
    d.t('BUILDING 8', 1190, 640, 64, '#e8e0c8', 0.12, 'A', 'c'); d.t('LINCOLN', 1190, 720, 36, '#e8e0c8', 0.12, 'A', 'c')
    for x, y in ((900, 300), (900, 1100), (1450, 300), (1450, 1100)): d.g(x, y, 240, '#fff0c8', 0.14)
    for y in (280, 720, 1160): d.g(2250, y, 160, '#ff2020', 0.18)
    d.t('EXIT', 2250, 690, 40, '#ff3030', 0.3, 'A', 'c')
    return A

def barn():     # Ch6 "DEEPER": the barn in Iowa, dream rig in the middle
    A = Arena('barn', 'THE BARN ' + '•' + ' IOWA', ('planks',))
    for x in (400, 640, 880): A.piece(x, 0, 30, 280, 'stall'); A.piece(x, 1160, 30, 280, 'stall')
    A.piece(300, 560, 120, 60, 'hay'); A.piece(300, 820, 120, 60, 'hay')
    A.piece(700, 500, 60, 120, 'hay'); A.piece(700, 820, 60, 120, 'hay')
    A.piece(960, 120, 170, 90, 'tractor')
    A.piece(480, 1260, 100, 100, 'bale'); A.piece(1000, 1300, 100, 100, 'bale')
    A.piece(1100, 640, 200, 160, 'rig', mirror=False)
    A.piece(1185, 220, 30, 140, 'glitch', mirror=False); A.piece(1185, 1080, 30, 140, 'glitch', mirror=False)
    d = A.decals
    d.g(1200, 720, 520, '#00e6ff', 0.14); d.g(1200, 720, 300, '#8232dc', 0.16)
    for k in range(5): d.o(1200 - 160 - k * 70, 720 - 110 - k * 48, 320 + k * 140, 220 + k * 96, '#00e6ff' if k % 2 else '#8232dc', 0.22 - k * 0.035, 3)
    for x in (300, 900, 1500, 2100): d.g(x, 40, 200, '#ffe0a0', 0.15)     # light through the roof boards
    return A


ARENAS = [apt, stairs, phouse, mhouse, b8lincoln, barn]

def preview(A, path):
    from PIL import Image, ImageDraw
    im = Image.new('RGB', (W // 4, H // 4), (40, 40, 40)); d = ImageDraw.Draw(im)
    for r, row in enumerate(A.block):
        for c, b in enumerate(row):
            if b: d.rectangle([c * CELL // 4, r * CELL // 4, (c + 1) * CELL // 4 - 1, (r + 1) * CELL // 4 - 1], fill=(90, 50, 50))
    for p in A.pieces: d.rectangle([p['x'] // 4, p['y'] // 4, (p['x'] + p['w']) // 4, (p['y'] + p['h']) // 4], outline=(255, 214, 10))
    for team in 'PB':
        for i in range(5):
            x, y = (120 if team == 'P' else W - 120), int(H * (i + 1) / 6 + 0.5)
            d.ellipse([x // 4 - 3, y // 4 - 3, x // 4 + 3, y // 4 + 3], fill=(0, 230, 255) if team == 'P' else (255, 140, 40))
    im.save(path)

def to_lua(v, ind=''):
    if isinstance(v, dict): return '{' + ','.join('%s=%s' % (k, to_lua(x)) for k, x in v.items()) + '}'
    if isinstance(v, (list, tuple)): return '{' + ','.join(to_lua(x) for x in v) + '}'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, str): return json.dumps(v, ensure_ascii=False)
    if isinstance(v, float): return ('%.3f' % v).rstrip('0').rstrip('.')
    return str(v)

if __name__ == '__main__':
    out = []
    ok = True
    for fn in ARENAS:
        A = fn()
        share, bad = A.check()
        print('%-8s %-34s pieces=%3d reach=%.3f %s' % (A.id, A.name, len(A.pieces), share, bad or ''))
        if share < 0.9 or bad: ok = False
        preview(A, '/tmp/arena_%s.png' % A.id)
        out.append(A.export())
    if not ok: sys.exit('layout problem')
    web = sys.argv[1] if len(sys.argv) > 1 else None
    lua = sys.argv[2] if len(sys.argv) > 2 else None
    head = 'Generated by perci-game/tools/gen_arenas.py. Do not edit by hand: change that script and run it again.'
    if web:
        open(web, 'w').write('/* ' + head + ' */\nwindow.PS_ARENAS = ' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
        print('web', web, os.path.getsize(web), 'bytes')
    if lua:
        # one function per arena keeps each chunk well under LuaJIT's per-function constant limit
        body = ''.join('A[%d] = (function() return %s end)()\n' % (i + 1, to_lua(x)) for i, x in enumerate(out))
        open(lua, 'w').write('-- ' + head + '\nlocal A = {}\n' + body + 'return A\n')
        print('lua', lua, os.path.getsize(lua), 'bytes')
