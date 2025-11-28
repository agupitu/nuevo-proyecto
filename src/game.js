import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { Player, AI } from './entities.js';
import { AIController } from './ai.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.lastTime = 0;
        this.gameOver = false;

        // Game State
        this.entities = [];
        this.projectiles = []; // If we have projectiles, though requirements say auto-attack in range
        this.forts = [];
        this.lanes = []; // Y coordinates of lanes

        // Teams
        this.player = new Player('blue', this);
        this.ai = new AI('red', this);
        this.aiController = new AIController(this.ai, this);

        // Systems
        this.renderer = new Renderer(this.ctx, this);
        this.input = new InputHandler(this.canvas, this);

        this.initMap();
    }

    initMap() {
        // Define 3 lanes
        const laneHeight = this.height / 3;
        this.lanes = [
            laneHeight * 0.5,
            laneHeight * 1.5,
            laneHeight * 2.5
        ];

        // Bases
        const margin = 100;
        this.player.hq = this.player.createHQ(margin, this.height / 2);
        this.ai.hq = this.ai.createHQ(this.width - margin, this.height / 2);

        this.entities.push(this.player.hq);
        this.entities.push(this.ai.hq);

        // Forts (Neutral)
        // Between lanes: Lane 1-2 gap, Lane 2-3 gap
        const fortX = this.width / 2;
        // Gap 1
        this.forts.push(new Fort(fortX, this.height / 3, this));
        // Gap 2
        this.forts.push(new Fort(fortX, (this.height / 3) * 2, this));
    }

    start() {
        requestAnimationFrame(this.loop.bind(this));
    }

    loop(timestamp) {
        if (this.gameOver) return;

        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.renderer.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        // Update Resources
        this.player.update(dt);
        this.ai.update(dt);
        this.aiController.update(dt);

        // Update Entities
        this.entities.forEach(e => e.update(dt));
        this.forts.forEach(f => f.update(dt));

        // Remove dead entities
        this.entities = this.entities.filter(e => !e.isDead);

        // Combat Logic
        this.handleCombat();

        // Check Win Condition
        if (this.player.hq.isDead) this.endGame('Derrota');
        if (this.ai.hq.isDead) this.endGame('Victoria');
    }

    handleCombat() {
        // Simple O(N^2) check for prototype
        for (let i = 0; i < this.entities.length; i++) {
            let u1 = this.entities[i];
            if (u1.team === 'neutral') continue;

            let target = null;
            let minDist = Infinity;

            for (let j = 0; j < this.entities.length; j++) {
                let u2 = this.entities[j];
                if (u1.team === u2.team) continue; // Same team

                const dist = Math.hypot(u1.x - u2.x, u1.y - u2.y);
                if (dist < u1.range && dist < minDist) {
                    minDist = dist;
                    target = u2;
                }
            }

            u1.target = target;
        }
    }

    endGame(result) {
        this.gameOver = true;
        const screen = document.getElementById('game-over-screen');
        const text = document.getElementById('winner-text');
        text.innerText = result;
        screen.classList.remove('hidden');
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        // Ideally re-position bases if window resizes, but for prototype we can ignore or reload
    }
}

// Placeholder for Fort class to avoid reference error before entities.js is fully defined
// In a real module system, we import it. I will add it to entities.js
import { Fort } from './entities.js';
