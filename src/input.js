import { Unit, HQ } from './entities.js';

export class InputHandler {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;

        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragEnd = { x: 0, y: 0 };

        this.isRightDragging = false;
        this.rightDragStart = { x: 0, y: 0 };
        this.rightDragEnd = { x: 0, y: 0 };

        this.selectedUnits = [];

        this.initListeners();
        this.initUI();
    }

    initListeners() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('contextmenu', this.onRightClick.bind(this));
        this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));

        // Prevent default context menu
        this.canvas.oncontextmenu = (e) => e.preventDefault();
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    onMouseDown(e) {
        const pos = this.getMousePos(e);

        if (e.button === 0) { // Left Click
            this.isDragging = true;
            this.dragStart = pos;
            this.dragEnd = pos;

            // Check if clicked on UI (Build Slot)
            const hq = this.game.player.hq;
            if (hq && !hq.isDead) {
                for (let slot of hq.buildSlots) {
                    const dist = Math.hypot(pos.x - slot.x, pos.y - slot.y);
                    if (dist < 20) { // Slot radius
                        this.openBuildMenu(slot);
                        this.isDragging = false; // Cancel drag
                        return;
                    }
                }
            }
        } else if (e.button === 2) { // Right Click
            this.isRightDragging = true;
            this.rightDragStart = pos;
            this.rightDragEnd = pos;
        }
    }

    onMouseMove(e) {
        const pos = this.getMousePos(e);
        if (this.isDragging) {
            this.dragEnd = pos;
        }
        if (this.isRightDragging) {
            this.rightDragEnd = pos;
        }
    }

    onMouseUp(e) {
        const pos = this.getMousePos(e);

        if (e.button === 0) { // Left Click Release
            if (!this.isDragging) return;
            this.isDragging = false;
            this.dragEnd = pos;
            this.handleSelection();
        } else if (e.button === 2) { // Right Click Release
            if (!this.isRightDragging) return;
            this.isRightDragging = false;
            this.rightDragEnd = pos;
            this.handleMoveCommand();
        }
    }

    onRightClick(e) {
        e.preventDefault();
    }

    handleSelection() {
        // Clear current selection
        this.selectedUnits.forEach(u => u.selected = false);
        this.selectedUnits = [];

        const minX = Math.min(this.dragStart.x, this.dragEnd.x);
        const maxX = Math.max(this.dragStart.x, this.dragEnd.x);
        const minY = Math.min(this.dragStart.y, this.dragEnd.y);
        const maxY = Math.max(this.dragStart.y, this.dragEnd.y);

        const isBox = (maxX - minX > 5 || maxY - minY > 5);

        if (isBox) {
            // Box selection
            this.game.entities.forEach(e => {
                if (e.team === 'blue' && e instanceof Unit) {
                    if (e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY) {
                        e.selected = true;
                        this.selectedUnits.push(e);
                    }
                }
            });
        } else {
            // Single click
            const clickX = this.dragStart.x;
            const clickY = this.dragStart.y;

            let clicked = null;
            for (let i = this.game.entities.length - 1; i >= 0; i--) {
                const e = this.game.entities[i];
                const dist = Math.hypot(e.x - clickX, e.y - clickY);
                if (dist <= e.radius) {
                    clicked = e;
                    break;
                }
            }

            if (clicked && clicked.team === 'blue') {
                clicked.selected = true;
                this.selectedUnits.push(clicked);
            }
        }
    }

    onDoubleClick(e) {
        const pos = this.getMousePos(e);
        let clicked = null;
        for (let i = this.game.entities.length - 1; i >= 0; i--) {
            const ent = this.game.entities[i];
            const dist = Math.hypot(ent.x - pos.x, ent.y - pos.y);
            if (dist <= ent.radius) {
                clicked = ent;
                break;
            }
        }

        if (clicked && clicked.team === 'blue' && clicked instanceof Unit) {
            this.game.entities.forEach(ent => {
                if (ent.team === 'blue' && ent instanceof Unit) {
                    ent.selected = true;
                    if (!this.selectedUnits.includes(ent)) {
                        this.selectedUnits.push(ent);
                    }
                }
            });
        }
    }

    handleMoveCommand() {
        if (this.selectedUnits.length === 0) return;

        const dx = this.rightDragEnd.x - this.rightDragStart.x;
        const dy = this.rightDragEnd.y - this.rightDragStart.y;
        const dragDist = Math.hypot(dx, dy);

        if (dragDist < 10) {
            // Simple Click: Move to point with random offset
            const pos = this.rightDragEnd;
            this.selectedUnits.forEach(u => {
                const offsetX = (Math.random() - 0.5) * 20;
                const offsetY = (Math.random() - 0.5) * 20;
                u.moveTarget = { x: pos.x + offsetX, y: pos.y + offsetY };
                u.target = null;
            });
        } else {
            // Drag: Formation Movement
            const lineVec = { x: dx, y: dy };
            const len = Math.hypot(lineVec.x, lineVec.y);
            const unitVec = { x: lineVec.x / len, y: lineVec.y / len };

            const unitSpacing = 25;
            const width = len;
            const unitsPerRow = Math.max(1, Math.floor(width / unitSpacing));

            // Perpendicular vector (-y, x)
            const perpVec = { x: -unitVec.y, y: unitVec.x };

            this.selectedUnits.forEach((u, i) => {
                const row = Math.floor(i / unitsPerRow);
                const col = i % unitsPerRow;

                // Position relative to start
                const x = this.rightDragStart.x + (col * unitSpacing * unitVec.x) + (row * unitSpacing * perpVec.x);
                const y = this.rightDragStart.y + (col * unitSpacing * unitVec.y) + (row * unitSpacing * perpVec.y);

                u.moveTarget = { x, y };
                u.target = null;
            });
        }
    }

    // Build Menu Logic
    initUI() {
        this.menu = document.getElementById('build-menu');
        this.currentSlot = null;

        document.getElementById('btn-close-menu').addEventListener('click', () => {
            this.menu.classList.add('hidden');
            this.currentSlot = null;
        });

        const buttons = document.querySelectorAll('.build-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.build(type);
            });
        });
    }

    openBuildMenu(slot) {
        if (slot.occupied) return;
        this.currentSlot = slot;
        this.menu.classList.remove('hidden');
    }

    build(type) {
        if (!this.currentSlot) return;

        const player = this.game.player;
        let cost = 0;

        if (type === 'tower') cost = 50;
        if (type === 'farm') cost = 100;
        if (type === 'house') cost = 75;

        if (player.gold >= cost) {
            player.gold -= cost;

            this.currentSlot.occupied = true;
            this.currentSlot.type = type; // Store type for rendering

            // Apply effects
            if (type === 'house') {
                player.hq.spawnInterval = Math.max(0.5, player.hq.spawnInterval - 0.1);
            }
            if (type === 'farm') {
                // Handled in Player update or just visual for now?
                // Plan said "Granja de Oro: Una estructura que aumenta la tasa pasiva"
                // We should implement this in Player.update
            }
            if (type === 'tower') {
                const tower = new Unit(this.currentSlot.x, this.currentSlot.y, 'blue', this.game);
                tower.speed = 0;
                tower.range = 200;
                tower.damage = 30;
                tower.radius = 20;
                tower.color = '#4ecca3';
                this.game.entities.push(tower);
            }

            this.menu.classList.add('hidden');
        } else {
            alert('No tienes suficiente oro!');
        }
    }
}
