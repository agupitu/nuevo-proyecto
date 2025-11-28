import { Unit } from './entities.js';

export class AIController {
    constructor(aiPlayer, game) {
        this.ai = aiPlayer;
        this.game = game;
        this.squads = []; // Array of { units: [], state: 'gathering'|'attacking', target: {x,y} }
        this.currentSquad = this.createSquad();

        this.buildTimer = 0;
    }

    createSquad() {
        return {
            units: [],
            state: 'gathering',
            targetSize: 3 + Math.floor(Math.random() * 4) // 3 to 6
        };
    }

    update(dt) {
        if (this.ai.hq.isDead) return;

        this.manageSquads();
        this.manageBuilding(dt);
    }

    manageSquads() {
        // 1. Assign idle units to current gathering squad
        const idleUnits = this.game.entities.filter(e =>
            e.team === 'red' &&
            e instanceof Unit &&
            !this.isAssigned(e) &&
            Math.hypot(e.x - this.ai.hq.x, e.y - this.ai.hq.y) < 300
        );

        idleUnits.forEach(u => this.currentSquad.units.push(u));

        // 2. Check if current squad is full
        if (this.currentSquad.units.length >= this.currentSquad.targetSize) {
            this.launchSquad(this.currentSquad);
            this.squads.push(this.currentSquad);
            this.currentSquad = this.createSquad(); // Start new one immediately
        }

        // 3. Update active squads
        this.squads.forEach(squad => {
            // Remove dead
            squad.units = squad.units.filter(u => !u.isDead);

            if (squad.state === 'attacking') {
                squad.units.forEach(u => {
                    if (!u.target && !u.moveTarget) {
                        // Keep moving to target
                        u.moveTarget = { x: squad.target.x, y: squad.target.y };
                    }
                });
            }
        });

        // 4. Update gathering squad formation
        this.currentSquad.units.forEach((u, index) => {
            const offsetX = (index % 3) * 30;
            const offsetY = Math.floor(index / 3) * 30;
            // Gather behind HQ
            u.moveTarget = {
                x: this.ai.hq.x + 100 + offsetX,
                y: this.ai.hq.y + offsetY - 50
            };
        });
    }

    isAssigned(unit) {
        if (this.currentSquad.units.includes(unit)) return true;
        for (let s of this.squads) {
            if (s.units.includes(unit)) return true;
        }
        return false;
    }

    launchSquad(squad) {
        squad.state = 'attacking';

        // Decide target: Player HQ or Neutral Fort
        // 30% chance to target a neutral/enemy fort
        const forts = this.game.forts.filter(f => f.team !== 'red');
        const targetFort = (Math.random() < 0.3 && forts.length > 0)
            ? forts[Math.floor(Math.random() * forts.length)]
            : null;

        if (targetFort) {
            squad.target = { x: targetFort.x, y: targetFort.y };
        } else {
            squad.target = { x: this.game.player.hq.x, y: this.game.player.hq.y };
        }
    }

    manageBuilding(dt) {
        this.buildTimer += dt;
        if (this.buildTimer < 2.0) return; // Check every 2s
        this.buildTimer = 0;

        const hq = this.ai.hq;
        if (!hq) return;

        // Find empty slot
        const emptySlots = hq.buildSlots.filter(s => !s.occupied);
        if (emptySlots.length === 0) return;

        const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];

        // Decide what to build
        // Priority: Farm > House > Tower
        // Check gold
        const gold = this.ai.gold;

        let type = null;
        let cost = 0;

        // Simple logic
        if (gold >= 100 && Math.random() < 0.5) {
            type = 'farm'; cost = 100;
        } else if (gold >= 75 && Math.random() < 0.5) {
            type = 'house'; cost = 75;
        } else if (gold >= 50 && Math.random() < 0.1) {
            type = 'tower'; cost = 50;
        }

        if (type) {
            this.ai.gold -= cost;
            slot.occupied = true;
            slot.type = type;

            if (type === 'house') {
                hq.spawnInterval = Math.max(0.5, hq.spawnInterval - 0.1);
            }
            if (type === 'tower') {
                const tower = new Unit(slot.x, slot.y, 'red', this.game);
                tower.speed = 0;
                tower.range = 200;
                tower.damage = 30;
                tower.radius = 20;
                tower.color = '#e94560';
                this.game.entities.push(tower);
            }
            // Farm logic needs to be in Player update or slot check
        }
    }
}
