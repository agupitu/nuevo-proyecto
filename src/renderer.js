import { Unit, HQ, Fort, Building } from './entities.js';

export class Renderer {
    constructor(ctx, game) {
        this.ctx = ctx;
        this.game = game;
    }

    draw() {
        // Clear screen
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.game.width, this.game.height);

        this.drawMap();
        this.drawEntities();
        this.drawUI();
    }

    drawMap() {
        // Draw Lanes
        this.ctx.fillStyle = '#16213e';
        const laneHeight = 60;
        this.game.lanes.forEach(y => {
            this.ctx.fillRect(0, y - laneHeight / 2, this.game.width, laneHeight);
        });

        // Draw Build Slots for Player
        const hq = this.game.player.hq;
        if (hq && !hq.isDead) {
            hq.buildSlots.forEach(slot => {
                this.ctx.beginPath();
                this.ctx.arc(slot.x, slot.y, 15, 0, Math.PI * 2);
                if (slot.occupied) {
                    this.ctx.fillStyle = '#4ecca3';
                    if (slot.type === 'farm') this.ctx.fillStyle = '#ffd700';
                    this.ctx.fill();
                } else {
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                    // Plus icon
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    this.ctx.font = '20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText('+', slot.x, slot.y);
                }
            });
        }
    }

    drawEntities() {
        // Draw Forts first (bottom layer)
        this.game.forts.forEach(f => f.draw(this.ctx));

        // Draw Entities
        this.game.entities.forEach(e => e.draw(this.ctx));
    }

    drawUI() {
        // Selection Box
        const input = this.game.input;
        if (input.isDragging) {
            const w = input.dragEnd.x - input.dragStart.x;
            const h = input.dragEnd.y - input.dragStart.y;

            this.ctx.strokeStyle = '#4ecca3';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(input.dragStart.x, input.dragStart.y, w, h);
            this.ctx.fillStyle = 'rgba(78, 204, 163, 0.1)';
            this.ctx.fillRect(input.dragStart.x, input.dragStart.y, w, h);
        }
    }
}
