export class Entity {
    constructor(x, y, radius, color, team, game) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.team = team; // 'blue' (player), 'red' (ai), 'neutral'
        this.game = game;
        this.isDead = false;
        this.selected = false;
    }

    update(dt) { }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        if (this.selected) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

export class Unit extends Entity {
    constructor(x, y, team, game) {
        super(x, y, 10, team === 'blue' ? '#2b73a3ff' : '#b83333ff', team, game);
        this.speed = 100;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.damage = Math.floor(Math.random() * 6) + 5;
        this.range = 50;
        this.attackCooldown = 2.0;
        this.currentCooldown = 0;
        this.target = null;
        this.moveTarget = null; // {x, y}
    }

    update(dt) {
        if (this.currentCooldown > 0) this.currentCooldown -= dt;

        // Collision / Separation
        this.applySeparation(dt);

        // Combat
        if (this.target && !this.target.isDead) {
            const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
            if (dist <= this.range) {
                // Attack
                if (this.currentCooldown <= 0) {
                    this.target.takeDamage(this.damage);
                    this.currentCooldown = this.attackCooldown;
                }
                return; // Stop moving if attacking
            }
        }

        // Movement
        if (this.moveTarget) {
            const dx = this.moveTarget.x - this.x;
            const dy = this.moveTarget.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 5) {
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * this.speed * dt;
                this.y += Math.sin(angle) * this.speed * dt;
            } else {
                this.moveTarget = null;
            }
        }
    }

    applySeparation(dt) {
        const separationRadius = this.radius * 2.5; // Slightly larger than diameter
        const force = 50; // Push strength

        this.game.entities.forEach(other => {
            if (other === this || !(other instanceof Unit) || other.isDead) return;

            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const dist = Math.hypot(dx, dy);

            if (dist < separationRadius && dist > 0) {
                // Push away
                const angle = Math.atan2(dy, dx);
                const push = (separationRadius - dist) / separationRadius; // Stronger when closer
                this.x += Math.cos(angle) * force * push * dt;
                this.y += Math.sin(angle) * force * push * dt;
            }
        });
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.isDead = true;
        }
    }

    draw(ctx) {
        super.draw(ctx);
        // Health bar
        const hpPct = this.health / this.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 10, this.y - 15, 20, 4);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x - 10, this.y - 15, 20 * hpPct, 4);
    }
}

export class Building extends Entity {
    constructor(x, y, size, color, team, game) {
        super(x, y, size, color, team, game);
        this.maxHealth = 500;
        this.health = this.maxHealth;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.isDead = true;
        }
    }

    draw(ctx) {
        // Square for buildings
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);

        if (this.selected) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        }

        // Health bar
        const hpPct = this.health / this.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 10, this.radius * 2, 5);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 10, (this.radius * 2) * hpPct, 5);
    }
}

export class HQ extends Building {
    constructor(x, y, team, game) {
        super(x, y, 30, team === 'blue' ? '#233e8b' : '#8b2323', team, game);
        this.spawnTimer = 0;
        this.spawnInterval = 3.0;
        this.buildSlots = []; // Array of {x, y, occupied: boolean, building: null}
        this.initBuildSlots();

        // Passive gold generation
        this.goldTimer = 0;
    }

    initBuildSlots() {
        // 8 slots around HQ
        const offsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0], [1, 0],
            [-1, 1], [0, 1], [1, 1]
        ];
        const spacing = 70;

        offsets.forEach(off => {
            this.buildSlots.push({
                x: this.x + off[0] * spacing,
                y: this.y + off[1] * spacing,
                occupied: false,
                building: null
            });
        });
    }

    update(dt) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnUnit();
        }

        // Generate 2 Gold / sec
        this.goldTimer += dt;
        if (this.goldTimer >= 1.0) {
            this.goldTimer = 0;
            // Find owner
            if (this.team === 'blue') this.game.player.gold += 2;
            if (this.team === 'red') this.game.ai.gold += 2;
        }
    }

    spawnUnit() {
        // Spawn unit near HQ
        const u = new Unit(this.x, this.y + 40, this.team, this.game);
        // Initial move to clear HQ
        u.moveTarget = { x: this.x + (this.team === 'blue' ? 50 : -50), y: this.y };
        this.game.entities.push(u);
    }
}

export class Fort extends Entity {
    constructor(x, y, game) {
        super(x, y, 25, 'gray', 'neutral', game);
        this.captureProgress = 0; // -100 (red) to 100 (blue)
        this.captureRate = 20;
    }

    update(dt) {
        // Check for nearby units
        let blueCount = 0;
        let redCount = 0;

        this.game.entities.forEach(e => {
            if (e instanceof Unit) {
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                if (dist < 100) {
                    if (e.team === 'blue') blueCount++;
                    if (e.team === 'red') redCount++;
                }
            }
        });

        if (blueCount > redCount) {
            this.captureProgress += this.captureRate * dt;
        } else if (redCount > blueCount) {
            this.captureProgress -= this.captureRate * dt;
        }

        // Clamp
        this.captureProgress = Math.max(-100, Math.min(100, this.captureProgress));

        // Determine owner
        if (this.captureProgress >= 100) {
            this.team = 'blue';
            this.color = '#4ecca3';
        } else if (this.captureProgress <= -100) {
            this.team = 'red';
            this.color = '#e94560';
        } else {
            this.team = 'neutral';
            this.color = 'gray';
        }
    }

    draw(ctx) {
        super.draw(ctx);
        // Draw capture bar
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - 20, this.y - 35, 40, 6);

        // Center is 0
        const w = (this.captureProgress / 100) * 20; // -20 to 20
        if (w > 0) {
            ctx.fillStyle = '#4ecca3';
            ctx.fillRect(this.x, this.y - 35, w, 6);
        } else {
            ctx.fillStyle = '#e94560';
            ctx.fillRect(this.x + w, this.y - 35, -w, 6);
        }
    }
}

export class Player {
    constructor(team, game) {
        this.team = team;
        this.game = game;
        this.gold = 0;
        this.hq = null;
    }

    createHQ(x, y) {
        return new HQ(x, y, this.team, this.game);
    }

    update(dt) {
        // Passive gold from Forts
        this.game.forts.forEach(f => {
            if (f.team === this.team) {
                this.gold += 1 * dt;
            }
        });

        // Passive gold from Farms
        if (this.hq && !this.hq.isDead) {
            let farmCount = 0;
            this.hq.buildSlots.forEach(slot => {
                if (slot.occupied && slot.type === 'farm') {
                    farmCount++;
                }
            });
            this.gold += farmCount * 2 * dt; // +2 gold per farm per second
        }

        // Update UI if player
        if (this.team === 'blue') {
            document.getElementById('gold-display').innerText = `Oro: ${Math.floor(this.gold)}`;
        }
    }
}

export class AI extends Player {
    constructor(team, game) {
        super(team, game);
    }
}
