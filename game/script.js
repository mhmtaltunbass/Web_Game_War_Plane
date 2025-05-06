// Oyun değişkenleri
        let canvas, ctx;
        let gameRunning = false;
        let gamePaused = false;
        let score = 0;
        let lives = 3;
        let level = 1;
        let wave = 1;
        let player;
        let enemies = [];
        let bullets = [];
        let particles = [];
        let powerups = [];
        let lastTime = 0;
        let deltaTime = 0;
        let keys = {};
        let screenShake = 0;
        let activePowerup = null;
        let powerupTimer = 0;
        let missionTarget = 10;
        let missionProgress = 0;
        let gameSettings = {
            masterVolume: 0.7,
            sfxVolume: 0.8,
            musicVolume: 0.5,
            difficulty: 2,
            graphicsQuality: 3
        };
        let isTutorialComplete = false;
        let bossActive = false;
        let boss = null;
        let isTransitioning = false;
        let highScores = [];
        let spaceDecorations = [];
        
        // Oyun sınıfları
        class Player {
            constructor() {
                this.width = 100;
                this.height = 140;
                this.x = canvas.width / 2 - this.width / 2;
                this.y = canvas.height - this.height - 20;
                this.speed = 6;
                this.image = new Image();
                this.image.src = 'images/tr4.png'; // Oyuncu uçağı resmi
                this.shootDelay = 300;
                this.lastShot = 0;
                this.powerLevel = 1;
                this.invulnerable = false;
                this.invulnerabilityTime = 0;
                this.engineGlow = 0;
            }
            
            update() {
                // Klavye kontrolü
                if (keys['ArrowLeft'] || keys['a']) {
                    this.x -= this.speed;
                }
                if (keys['ArrowRight'] || keys['d']) {
                    this.x += this.speed;
                }
                
                // Sınırları kontrol et
                if (this.x < 0) this.x = 0;
                if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;
                
                // Invulnerability kontrolü
                if (this.invulnerable) {
                    this.invulnerabilityTime -= deltaTime;
                    if (this.invulnerabilityTime <= 0) {
                        this.invulnerable = false;
                    }
                }
            }
            
            draw() {
                ctx.save();
            
                // Invulnerability efekti
                if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
                    ctx.globalAlpha = 0.5;
                }
            
                // Gemi gövdesi
                ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            
                ctx.restore();
            }
            
            shoot() {
                const now = Date.now();
                if (now - this.lastShot > this.shootDelay) {
                    this.lastShot = now;
            
                    // Güç seviyesine göre mermi oluştur
                    if (this.powerLevel === 1) {
                        // Tek mermi - uçağın uç kısmından (merkezden)
                        bullets.push(new Bullet(
                            this.x + this.width / 2 - 2, // Uçağın merkezi
                            this.y, // Uçağın üst kısmı
                            0,
                            -10,
                            'player'
                        ));
                        playSoundEffect('shoot');
                    } else if (this.powerLevel === 2) {
                        // İki mermi - sağ ve sol kanatlardan
                        bullets.push(new Bullet(
                            this.x + this.width * 0.07, // Sol kanat
                            this.y + this.height * 0.3, // Kanat yüksekliği
                            0,
                            -10,
                            'player'
                        ));
                        bullets.push(new Bullet(
                            this.x + this.width * 0.91, // Sağ kanat
                            this.y + this.height * 0.3, // Kanat yüksekliği
                            0,
                            -10,
                            'player'
                        ));
                        playSoundEffect('shoot');
                    } else if (this.powerLevel >= 3) {
                        // Üç mermi - uç kısımdan ve kanatlardan
                        bullets.push(new Bullet(
                            this.x + this.width / 2 - 2, // Uçağın merkezi
                            this.y, // Uçağın üst kısmı
                            0,
                            -10,
                            'player'
                        ));
                        bullets.push(new Bullet(
                            this.x + this.width * 0.07, // Sol kanat
                            this.y + this.height * 0.3, // Kanat yüksekliği
                            0,
                            -10,
                            'player'
                        ));
                        bullets.push(new Bullet(
                            this.x + this.width * 0.91, // Sağ kanat
                            this.y + this.height * 0.3, // Kanat yüksekliği
                            0,
                            -10,
                            'player'
                        ));
                        playSoundEffect('shoot');
                    }
                }
            }
            
            hit() {
                if (!this.invulnerable) {
                    lives--;
                    updateLives();
                    this.invulnerable = true;
                    this.invulnerabilityTime = 2000; // 2 saniye invulnerability
                    
                    // Hasar efekti
                    document.getElementById('damage-overlay').classList.add('active');
                    setTimeout(() => {
                        document.getElementById('damage-overlay').classList.remove('active');
                    }, 500);
                    
                    // Ekran sarsıntısı
                    screenShake = 10;
                    
                    // Ses efekti
                    playSoundEffect('playerHit');
                    
                    // Ölüm kontrolü
                    if (lives <= 0) {
                        gameOver();
                    }
                }
            }
        }
        
        class Enemy {
            constructor(type = 'basic') {
                this.type = type;
                this.width = 100;
                this.height = 100;
                this.x = Math.random() * (canvas.width - this.width);
                this.y = -this.height;
                this.speed = 2 + Math.random() * 1;
                this.health = 1;
                this.score = 10;
                this.image = new Image();
                this.image.src = 'images/usa3-Photoroom.png'; // Düşman uçağı resmi

                if (type === 'fast') {
                    this.speed = 4 + Math.random() * 2;
                    this.score = 15;
                } else if (type === 'tank') {
                    this.width = 70;
                    this.height = 60;
                    this.speed = 1 + Math.random() * 0.5;
                    this.health = 3;
                    this.score = 30;
                }
            }

            update() {
                if (this.frozen) return false; // Donmuşsa hareket etme
                this.y += this.speed;
                
                // Rastgele ateş etme
                if (Math.random() < this.shootProbability) {
                    this.shoot();
                }
                
                // Ekrandan çıktı mı?
                return this.y > canvas.height;
            }
            
            draw() {
                ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            }
            
            shoot() {
                bullets.push(new Bullet(
                    this.x + this.width / 2 - 2,
                    this.y + this.height,
                    0,
                    5,
                    'enemy'
                ));
            }
            
            hit() {
                this.health--;
                
                // Hasar efekti parçacıkları
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(
                        this.x + this.width / 2,
                        this.y + this.height / 2,
                        this.color
                    ));
                }
                
                // Ölüm kontrolü
                if (this.health <= 0) {
                    // Skor ekleme
                    updateScore(this.score);
                    
                    // Görev ilerlemesi
                    missionProgress++;
                    updateMissionProgress();
                    
                    // Patlama efekti
                    for (let i = 0; i < 20; i++) {
                        particles.push(new Particle(
                            this.x + this.width / 2,
                            this.y + this.height / 2,
                            this.color
                        ));
                    }
                    
                    // Powerup düşürme şansı
                    if (Math.random() < 0.1) {
                        const powerupTypes = ['weapon', 'shield', 'speedBoost', 'extraLife', 'freeze'];
                        const selectedType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];

                        if (selectedType === 'freeze') {
                            powerups.push(new FreezePowerup(this.x + this.width / 2, this.y + this.height / 2));
                        } else {
                            powerups.push(new Powerup(this.x + this.width / 2, this.y + this.height / 2));
                        }
                    }
                    
                    // Ses efekti
                    playSoundEffect('enemyDestroyed');
                    
                    return true;
                }
                
                // Ses efekti
                playSoundEffect('enemyHit');
                
                return false;
            }
        }
        
        class Boss {
            constructor(type) {
                this.type = type;
                this.width = 200;
                this.height = 150;
                this.x = canvas.width / 2 - this.width / 2;
                this.y = -this.height;
                this.targetY = 100;
                this.speed = 1;
                this.maxHealth = 100;
                this.health = this.maxHealth;
                this.score = 500;
                this.shootTimer = 0;
                this.moveDirection = 1;
                this.phase = 1;
                
                // Boss tipine göre özellikler
                if (type === 'emperor') {
                    this.name = "Kızıl İmparator";
                    this.color = '#ff3366';
                } else if (type === 'destroyer') {
                    this.name = "Yıkım Lordu";
                    this.color = '#9500ff';
                    this.maxHealth = 150;
                    this.health = this.maxHealth;
                } else {
                    this.name = "Bilinmeyen Boss";
                    this.color = '#ff0000';
                }
                
                // Boss UI'ını göster
                document.getElementById('boss-name').textContent = this.name;
                document.getElementById('boss-health-container').classList.add('active');
                updateBossHealth();
            }
            
            update() {
                // Hedef pozisyona doğru hareket
                if (this.y < this.targetY) {
                    this.y += this.speed;
                } else {
                    // Yatay hareket
                    this.x += this.moveDirection * this.speed;
                    
                    // Kenarlara gelince yön değiştir
                    if (this.x <= 0 || this.x + this.width >= canvas.width) {
                        this.moveDirection *= -1;
                    }
                    
                    // Ateş zamanlaması
                    this.shootTimer += deltaTime;
                    
                    // Faz durumuna göre ateş paterni
                    if (this.phase === 1) {
                        if (this.shootTimer > 1000) {
                            this.shootBasicPattern();
                            this.shootTimer = 0;
                        }
                    } else if (this.phase === 2) {
                        if (this.shootTimer > 800) {
                            this.shootSpreadPattern();
                            this.shootTimer = 0;
                        }
                    } else if (this.phase === 3) {
                        if (this.shootTimer > 600) {
                            this.shootCirclePattern();
                            this.shootTimer = 0;
                        }
                    }
                }
            }
            
            draw() {
                ctx.save();
                
                // Motor ışıltısı
                const glowIntensity = 0.7 + Math.sin(Date.now() / 200) * 0.3;
                
                // Boss gövdesi
                ctx.fillStyle = this.color;
                ctx.beginPath();
                
                // Ana gövde
                ctx.moveTo(this.x + this.width * 0.3, this.y);
                ctx.lineTo(this.x + this.width * 0.7, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height * 0.3);
                ctx.lineTo(this.x + this.width, this.y + this.height * 0.7);
                ctx.lineTo(this.x + this.width * 0.7, this.y + this.height);
                ctx.lineTo(this.x + this.width * 0.3, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height * 0.7);
                ctx.lineTo(this.x, this.y + this.height * 0.3);
                ctx.closePath();
                ctx.fill();
                
                // Orta bölüm
                ctx.fillStyle = this.type === 'emperor' ? '#ff0000' : '#9500ff';
                ctx.beginPath();
                ctx.moveTo(this.x + this.width * 0.35, this.y + this.height * 0.2);
                ctx.lineTo(this.x + this.width * 0.65, this.y + this.height * 0.2);
                ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.5);
                ctx.lineTo(this.x + this.width * 0.65, this.y + this.height * 0.8);
                ctx.lineTo(this.x + this.width * 0.35, this.y + this.height * 0.8);
                ctx.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.5);
                ctx.closePath();
                ctx.fill();
                
                // Motor alevleri
                const engineColor = `rgba(255, ${Math.floor(100 + glowIntensity * 155)}, 0, ${glowIntensity})`;
                ctx.fillStyle = engineColor;
                
                // Ana motor
                ctx.beginPath();
                ctx.moveTo(this.x + this.width * 0.4, this.y + this.height);
                ctx.lineTo(this.x + this.width * 0.6, this.y + this.height);
                ctx.lineTo(this.x + this.width * 0.5, this.y + this.height + 30 * glowIntensity);
                ctx.closePath();
                ctx.fill();
                
                // Yan motorlar
                ctx.beginPath();
                ctx.moveTo(this.x + this.width * 0.2, this.y + this.height * 0.7);
                ctx.lineTo(this.x + this.width * 0.3, this.y + this.height * 0.7);
                ctx.lineTo(this.x + this.width * 0.25, this.y + this.height * 0.9);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(this.x + this.width * 0.7, this.y + this.height * 0.7);
                ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.7);
                ctx.lineTo(this.x + this.width * 0.75, this.y + this.height * 0.9);
                ctx.closePath();
                ctx.fill();
                
                // Faz göstergeleri
                if (this.phase >= 2) {
                    ctx.fillStyle = '#ff9500';
                    ctx.beginPath();
                    ctx.arc(this.x + this.width * 0.25, this.y + this.height * 0.5, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                if (this.phase >= 3) {
                    ctx.fillStyle = '#ff9500';
                    ctx.beginPath();
                    ctx.arc(this.x + this.width * 0.75, this.y + this.height * 0.5, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.restore();
            }
            
            shootBasicPattern() {
                // Temel ateş paterni
                bullets.push(new Bullet(
                    this.x + this.width / 2 - 5,
                    this.y + this.height,
                    0,
                    5,
                    'enemy',
                    10
                ));
                
                bullets.push(new Bullet(
                    this.x + 50,
                    this.y + this.height - 20,
                    -1, 
                    5,
                    'enemy',
                    8
                ));
                
                bullets.push(new Bullet(
                    this.x + this.width - 50,
                    this.y + this.height - 20,
                    1,
                    5,
                    'enemy',
                    8
                ));
                
                playSoundEffect('bossShoot');
            }
            
            shootSpreadPattern() {
                // Yayılan ateş paterni
                for (let i = -2; i <= 2; i++) {
                    bullets.push(new Bullet(
                        this.x + this.width / 2,
                        this.y + this.height / 2,
                        i * 2,
                        4,
                        'enemy',
                        8
                    ));
                }
                
                playSoundEffect('bossShoot');
            }
            
            shootCirclePattern() {
                // Dairesel ateş paterni
                const bulletCount = 12;
                for (let i = 0; i < bulletCount; i++) {
                    const angle = (i / bulletCount) * Math.PI * 2;
                    const vx = Math.cos(angle) * 3;
                    const vy = Math.sin(angle) * 3;
                    
                    bullets.push(new Bullet(
                        this.x + this.width / 2,
                        this.y + this.height / 2,
                        vx,
                        vy,
                        'enemy',
                        8,
                        '#ff9500'
                    ));
                }
                
                playSoundEffect('bossShoot');
            }
            
            hit() {
                this.health--;
                updateBossHealth();
                
                // Hasar efekti parçacıkları
                for (let i = 0; i < 3; i++) {
                    particles.push(new Particle(
                        this.x + Math.random() * this.width,
                        this.y + Math.random() * this.height,
                        this.color
                    ));
                }
                
                // Faz kontrolü
                if (this.health <= this.maxHealth * 0.6 && this.phase === 1) {
                    this.phase = 2;
                    // Ekstra efekt
                    for (let i = 0; i < 30; i++) {
                        particles.push(new Particle(
                            this.x + this.width / 2,
                            this.y + this.height / 2,
                            '#ff9500'
                        ));
                    }
                } else if (this.health <= this.maxHealth * 0.3 && this.phase === 2) {
                    this.phase = 3;
                    // Ekstra efekt
                    for (let i = 0; i < 30; i++) {
                        particles.push(new Particle(
                            this.x + this.width / 2,
                            this.y + this.height / 2,
                            '#ff9500'
                        ));
                    }
                }
                
                // Ölüm kontrolü
                if (this.health <= 0) {
                    // Skor ekleme
                    updateScore(this.score);
                    
                    // Büyük patlama efekti
                    for (let i = 0; i < 100; i++) {
                        particles.push(new Particle(
                            this.x + Math.random() * this.width,
                            this.y + Math.random() * this.height,
                            this.color,
                            2 + Math.random() * 3,
                            2000 + Math.random() * 1000
                        ));
                    }
                    
                    // Boss UI'ını gizle
                    document.getElementById('boss-health-container').classList.remove('active');
                    
                    // Ekran sarsıntısı
                    screenShake = 20;
                    
                    // Ses efekti
                    playSoundEffect('bossDefeated');
                    
                    // Boss yenildi bayrağı
                    bossActive = false;
                    
                    // Bir sonraki seviyeye geç
                    setTimeout(() => {
                        levelComplete();
                    }, 2000);
                    
                    return true;
                }
                
                // Ses efekti
                playSoundEffect('bossHit');
                
                return false;
            }
        }
        
        class Bullet {
            constructor(x, y, vx, vy, source, size = 5, color = null) {
                this.x = x;
                this.y = y;
                this.vx = vx;
                this.vy = vy;
                this.width = size;
                this.height = size * 2;
                this.source = source; // 'player' veya 'enemy'
                
                if (color) {
                    this.color = color;
                } else if (source === 'player') {
                    this.color = '#00eaff';
                } else {
                    this.color = '#ff3366';
                }
            }
            
            update() {
                this.x += this.vx;
                this.y += this.vy;
                
                // Ekrandan çıktı mı?
                return this.y < -this.height || this.y > canvas.height || 
                       this.x < -this.width || this.x > canvas.width;
            }
            
            draw() {
                if (this.source === 'player') {
                    // Oyuncu mermileri için kırmızı renk
                    ctx.fillStyle = '#ff0000'; // Kırmızı renk
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y + this.height);
                    ctx.lineTo(this.x + this.width, this.y + this.height);
                    ctx.lineTo(this.x + this.width / 2, this.y);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Düşman mermileri için varsayılan renk
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(this.x + this.width, this.y);
                    ctx.lineTo(this.x + this.width / 2, this.y + this.height);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            
            checkCollision(obj) {
                const buffer = 5; // Çarpışma toleransı
                return this.x + buffer < obj.x + obj.width - buffer &&
                       this.x + this.width - buffer > obj.x + buffer &&
                       this.y + buffer < obj.y + obj.height - buffer &&
                       this.y + this.height - buffer > obj.y + buffer;
            }
        }
        
        class Particle {
            constructor(x, y, color, speed = 1, lifetime = 1000) {
                this.x = x;
                this.y = y;
                this.size = 1 + Math.random() * 5;
                this.speedX = (Math.random() - 0.5) * 5 * speed;
                this.speedY = (Math.random() - 0.5) * 5 * speed;
                this.color = color;
                this.lifetime = lifetime;
                this.life = lifetime;
            }
            
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.life -= deltaTime;
                
                // Yaşam süresi bitti mi?
                return this.life <= 0;
            }
            
            draw() {
                const alpha = this.life / this.lifetime;
                ctx.fillStyle = `${this.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        class Powerup {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.width = 30;
                this.height = 30;
                this.speed = 2;
                this.type = this.getRandomType();
                this.angle = 0;
            }
            
            getRandomType() {
                const types = ['weapon', 'shield', 'speedBoost', 'extraLife'];
                const weights = [0.4, 0.3, 0.2, 0.1]; // Ağırlıklar
                const random = Math.random();
                let sum = 0;
                
                for (let i = 0; i < types.length; i++) {
                    sum += weights[i];
                    if (random < sum) {
                        return types[i];
                    }
                }
                
                return types[0];
            }
            
            update() {
                this.y += this.speed;
                this.angle += 0.05; // Dönme animasyonu
                
                // Ekrandan çıktı mı?
                return this.y > canvas.height;
            }
            
            draw() {
                ctx.save();
                ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
                ctx.rotate(this.angle);
                
                // Powerup tipine göre çizim
                if (this.type === 'weapon') {
                    ctx.fillStyle = '#ffd700';
                    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(-5, -10);
                    ctx.lineTo(5, -10);
                    ctx.lineTo(0, 10);
                    ctx.closePath();
                    ctx.fill();
                    
                } else if (this.type === 'shield') {
                    ctx.fillStyle = '#4cafff';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.width / 3, 0, Math.PI * 2);
                    ctx.stroke();
                    
                } else if (this.type === 'speedBoost') {
                    ctx.fillStyle = '#ff9500';
                    ctx.beginPath();
                    ctx.moveTo(-this.width / 2, 0);
                    ctx.lineTo(this.width / 2, 0);
                    ctx.lineTo(0, -this.height / 2);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(-this.width / 2, 0);
                    ctx.lineTo(this.width / 2, 0);
                    ctx.lineTo(0, this.height / 2);
                    ctx.closePath();
                    ctx.fill();
                } else if (this.type === 'extraLife') {
                    ctx.fillStyle = '#ff3366';
                    ctx.beginPath();
                    ctx.moveTo(0, -this.height / 2);
                    ctx.bezierCurveTo(
                        this.width / 2, -this.height / 4,
                        this.width / 2, this.height / 4,
                        0, this.height / 2
                    );
                    ctx.bezierCurveTo(
                        -this.width / 2, this.height / 4,
                        -this.width / 2, -this.height / 4,
                        0, -this.height / 2
                    );
                    ctx.fill();
                }

                ctx.restore();

                // Işıltı efekti
                ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.5;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            checkCollision(obj) {
                return this.x < obj.x + obj.width &&
                       this.x + this.width > obj.x &&
                       this.y < obj.y + obj.height &&
                       this.y + this.height > obj.y;
            }

            collect() {
                // Powerup tipine göre etki
                if (this.type === 'weapon') {
                    player.powerLevel = Math.min(player.powerLevel + 1, 3);
                    activatePowerup('Silah Güçlendirme!', 10000);
                } else if (this.type === 'shield') {
                    player.invulnerable = true;
                    player.invulnerabilityTime = 8000; // 8 saniye koruma
                    activatePowerup('Kalkan Aktif!', 8000);
                } else if (this.type === 'speedBoost') {
                    const originalSpeed = player.speed;
                    player.speed *= 1.5;
                    activatePowerup('Hız Artışı!', 5000);
                    
                    // Süre bitince hızı normale döndür
                    setTimeout(() => {
                        player.speed = originalSpeed;
                    }, 5000);
                } else if (this.type === 'extraLife') {
                    lives = Math.min(lives + 1, 5);
                    updateLives();
                    activatePowerup('Ekstra Can!', 2000);
                }
                
                // Skor ekleme
                updateScore(50);
                
                // Ses efekti
                playSoundEffect('powerup');
            }
        }
        
        class ZigZagEnemy extends Enemy {
            constructor() {
                super('zigzag');
                this.speedX = 2; // Yatay hız
                this.direction = Math.random() > 0.5 ? 1 : -1; // Başlangıç yönü
            }
        
            update() {
                this.y += this.speed; // Dikey hareket
                this.x += this.speedX * this.direction; // Yatay hareket
        
                // Kenarlara çarptığında yön değiştir
                if (this.x <= 0 || this.x >= canvas.width - this.width) {
                    this.direction *= -1;
                }
        
                return this.y > canvas.height; // Ekrandan çıktı mı?
            }
        }
        
        class FreezePowerup extends Powerup {
            collect() {
                enemies.forEach(enemy => {
                    enemy.frozen = true; // Düşmanları dondur
                    setTimeout(() => { enemy.frozen = false; }, 3000); // 3 saniye sonra çözülür
                });
                activatePowerup('Düşmanlar Dondu!', 3000);
                playSoundEffect('freeze');
            }
        }
        
        // Uzay dekorasyonları oluşturma
        function createSpaceDecorations() {
            const container = document.getElementById('space-decorations');
            container.innerHTML = '';
            

            // Ay
            const moon = document.createElement('div');
            moon.className = 'space-decoration moon';
            moon.style.width = '80px';
            moon.style.height = '80px';
            moon.style.top = '100px';
            moon.style.right = '100px';
            container.appendChild(moon);
            
            // Nebula (bulutsu)
            const nebula = document.createElement('div');
            nebula.className = 'space-decoration nebula';
            nebula.style.top = '30%';
            nebula.style.left = '70%';
            container.appendChild(nebula);
            
            // Yıldızlar
            for (let i = 0; i < 100; i++) {
                const star = document.createElement('div');
                star.className = 'space-decoration star';
                const size = Math.random() * 3 + 1;
                star.style.width = `${size}px`;
                star.style.height = `${size}px`;
                star.style.top = `${Math.random() * 100}%`;
                star.style.left = `${Math.random() * 100}%`;
                star.style.animationDelay = `${Math.random() * 2}s`;
                container.appendChild(star);
            }
            
            // Kuyruklu yıldız
            const comet = document.createElement('div');
            comet.className = 'space-decoration comet';
            comet.style.top = '20%';
            comet.style.right = '10%';
            container.appendChild(comet);
            

            
            // Uzak galaksiler
            for (let i = 0; i < 3; i++) {
                const galaxy = document.createElement('div');
                galaxy.className = 'space-decoration';
                galaxy.style.width = '150px';
                galaxy.style.height = '150px';
                galaxy.style.borderRadius = '50%';
                galaxy.style.background = `radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, 
                    rgba(${Math.random() * 100 + 100},${Math.random() * 100},${Math.random() * 100 + 150},0.1), 
                    transparent 70%)`;
                galaxy.style.filter = 'blur(2px)';
                galaxy.style.top = `${Math.random() * 100}%`;
                galaxy.style.left = `${Math.random() * 100}%`;
                galaxy.style.opacity = '0.3';
                container.appendChild(galaxy);
            }
        }
        
        // Oyun başlatma ve ana döngü
        function initGame() {
            canvas = document.getElementById('gameCanvas');
            ctx = canvas.getContext('2d');
            
            // Canvas boyutunu ayarla (50px daha geniş)
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            
            // Uzay dekorasyonlarını oluştur
            createSpaceDecorations();
            
            // Ayarları ve yüksek skorları yükle
            loadSettings();
            loadHighScores();
            
            // Klavye dinleyicileri
            window.addEventListener('keydown', (e) => {
                keys[e.key] = true;
                
                // Ateş etme
                if (e.key === ' ' && gameRunning && !gamePaused) {
                    player.shoot();
                }
                
                // Oyunu duraklat
                if (e.key === 'p' && gameRunning) {
                    togglePause();
                }
            });
            
            window.addEventListener('keyup', (e) => {
                keys[e.key] = false;
            });
            
            // Mobil kontroller
            setupMobileControls();
            
            // Ses efektlerini önceden yükle
            loadSounds();
            
            // Başlangıç ekranını göster
            showScreen('start-screen');
        }
        
        function resizeCanvas() {
            // Tarayıcı penceresine uygun canvas boyutu (50px daha geniş)
            let width = Math.min(window.innerWidth - 40, 800);
            let height = Math.min(window.innerHeight - 40, 800);
            
            // Mobil cihazlarda tam ekran
            if (window.innerWidth < 600) {
                width = window.innerWidth;
                height = window.innerHeight;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Oyun konteyneri boyutunu ayarla
            document.getElementById('game-container').style.width = width + 'px';
            document.getElementById('game-container').style.height = height + 'px';
            
            // Uzay dekorasyonlarını yeniden oluştur
            createSpaceDecorations();
        }
        
        function setupMobileControls() {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // Mobil kontrolleri göster
                document.getElementById('mobile-controls').style.display = 'flex';
                document.getElementById('controls-hint').style.display = 'none';
                
                // Dokunmatik düğmeler
                const leftBtn = document.getElementById('mobile-left');
                const rightBtn = document.getElementById('mobile-right');
                const fireBtn = document.getElementById('mobile-fire');
                
                // Sol hareket
                leftBtn.addEventListener('touchstart', () => {
                    keys['ArrowLeft'] = true;
                });
                
                leftBtn.addEventListener('touchend', () => {
                    keys['ArrowLeft'] = false;
                });
                
                // Sağ hareket
                rightBtn.addEventListener('touchstart', () => {
                    keys['ArrowRight'] = true;
                });
                
                rightBtn.addEventListener('touchend', () => {
                    keys['ArrowRight'] = false;
                });
                
                // Ateş etme
                fireBtn.addEventListener('touchstart', () => {
                    if (gameRunning && !gamePaused) {
                        player.shoot();
                    }
                });
            }
        }
        
        const sounds = {};

        function loadSounds() {
            sounds.shoot = new Audio('sounds/shoot-1-81135.mp3');
            sounds.enemyHit = new Audio('sounds/cinematic-hit-159487.mp3');
            sounds.enemyDestroyed = new Audio('sounds/sci-fi-weapon-shoot-firing-plasma-pp-04-233822.mp3');
            sounds.playerHit = new Audio('sounds/enemy-detected-103347.mp3');
            sounds.powerup = new Audio('sounds/8-bit-powerup-6768.mp3');
            sounds.bossShoot = new Audio('sounds/big-hit-sound-effect-241416.mp3');
            // sounds.bossHit = new Audio('sounds/boss_hit.wav');
            // sounds.bossDefeated = new Audio('sounds/boss_defeated.wav');
        }

        function playSoundEffect(sound) {
            if (sounds[sound]) {
                sounds[sound].volume = gameSettings.sfxVolume * gameSettings.masterVolume;
                sounds[sound].currentTime = 0; // Sesi baştan oynat
                sounds[sound].play().catch(error => {
                    console.warn("Ses oynatılamadı:", error);
                });
            }
        }
        
        function showScreen(screenId) {
            // Tüm ekranları gizle
            const screens = document.querySelectorAll('.screen-overlay');
            screens.forEach(screen => {
                screen.classList.remove('active');
            });
            
            // İstenilen ekranı göster
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.classList.add('active');
            }
            
            // Ekran geçişlerinde oyunu duraklat
            if (gameRunning && screenId !== 'pause-screen') {
                gamePaused = true;
            }
        }
        
        function startGame() {
            console.log("Oyun başlatılıyor...");
            
            // Canvas ve context'i tekrar al
            canvas = document.getElementById('gameCanvas');
            ctx = canvas.getContext('2d');
            
            // Oyun değişkenlerini sıfırla (zorluk seviyesini ayarlardan al)
            score = 0;
            lives = 3;
            level = 1;
            wave = 1;
            missionProgress = 0;
            missionTarget = 10;
            gameRunning = true;
            gamePaused = false;
            
            // UI'ı güncelle
            updateScore(0);
            updateLives();
            updateLevel();
            updateMissionTarget();
            
            // Oyuncu, düşman ve mermi dizilerini sıfırla
            player = new Player();
            enemies = [];
            bullets = [];
            particles = [];
            powerups = [];
            
            // Ekranları gizle
            document.querySelectorAll('.screen-overlay').forEach(screen => {
                screen.classList.remove('active');
            });
            
            // Oyun döngüsünü başlat
            lastTime = Date.now();
            requestAnimationFrame(gameLoop);
            
            // Dalga duyurusunu göster
            showWaveAnnouncement();
            
            console.log("Oyun başlatıldı!");
        }
        
        function completeTutorial() {
            isTutorialComplete = true;
            document.querySelectorAll('.screen-overlay').forEach(screen => {
                screen.classList.remove('active');
            });
            
            // Oyun döngüsünü başlat
            lastTime = Date.now();
            requestAnimationFrame(gameLoop);
            
            // Dalga duyurusunu göster
            showWaveAnnouncement();
        }
        
        function gameLoop(timestamp) {
    // Delta zaman hesaplama
    const now = Date.now();
    deltaTime = now - lastTime;
    lastTime = now;

    // Oyun durum kontrolü
    if (gamePaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (isTransitioning) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Ekran temizleme ve sarsıntı efekti
    handleScreenEffects();

    // Oyun durum güncellemeleri
    updateGameState();

    // Çarpışma kontrolleri
    handleCollisions();

    // Render işlemleri
    renderGame();

    // Bir sonraki kare
    requestAnimationFrame(gameLoop);
}

function handleScreenEffects() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Ekran sarsıntısı efekti
    if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX, shakeY);
        screenShake = Math.max(0, screenShake - deltaTime / 50);
    }
}

function updateGameState() {
    // Oyuncu güncelleme
    player.update();

    // Otomatik ateş kontrolü
    if (keys[' ']) {
        player.shoot();
    }

    // Düşman spawn mekaniği
    if (!bossActive) {
        spawnEnemies();
    }

    // Varlıkları güncelle
    updateEntities();

    // Dalga ilerleme kontrolü
    checkWaveProgress();
}

function spawnEnemies() {
    const spawnRate = [0.005, 0.008, 0.012][gameSettings.difficulty - 1] || 0.008;

    if (Math.random() < spawnRate) {
        const enemyTypes = ['basic', 'zigzag'];
        let weights = [0.8, 0.2]; // Zig-zag düşmanların spawn olma olasılığı

        if (level >= 3) enemyTypes.push('tank'), weights = [0.6, 0.2, 0.2];
        if (level >= 4) enemyTypes.push('shooter'), weights = [0.5, 0.2, 0.2, 0.1];

        const selectedType = weightedRandomSelection(enemyTypes, weights);

        if (selectedType === 'zigzag') {
            enemies.push(new ZigZagEnemy());
        } else {
            enemies.push(new Enemy(selectedType));
        }
    }
}

function weightedRandomSelection(items, weights) {
    const random = Math.random();
    let sum = 0;
    
    for (let i = 0; i < items.length; i++) {
        sum += weights[i];
        if (random < sum) return items[i];
    }
    
    return items[0];
}

function updateEntities() {
    // Düşmanları güncelle
    enemies = enemies.filter(enemy => {
        if (enemy.update()) return false; // Ekrandan çıkanları filtrele
        return true;
    });

    // Boss güncelleme
    if (bossActive && boss) {
        boss.update();
    }

    // Mermileri güncelle
    bullets = bullets.filter(bullet => {
        if (bullet.update()) return false; // Ekrandan çıkanları filtrele
        return true;
    });

    // Parçacıkları güncelle
    particles = particles.filter(particle => {
        if (particle.update()) return false; // Ölenleri filtrele
        return true;
    });

    // Powerup'ları güncelle
    powerups = powerups.filter(powerup => {
        if (powerup.update()) return false; // Ekrandan çıkanları filtrele
        return true;
    });
}

function handleCollisions() {
    // Mermi çarpışmaları
    handleBulletCollisions();
    
    // Düşman-oyuncu çarpışmaları
    handleEnemyPlayerCollisions();
    
    // Powerup toplama
    handlePowerupCollection();
    
    // Boss çarpışmaları
    if (bossActive && boss) {
        handleBossCollisions();
    }
}

function handleBulletCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        if (bullet.source === 'player') {
            // Düşmanlara çarpan mermiler
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (bullet.checkCollision(enemies[j])) {
                    if (enemies[j].hit()) {
                        enemies.splice(j, 1);
                    }
                    bullets.splice(i, 1);
                    break;
                }
            }
            
            // Boss'a çarpan mermiler
            if (bossActive && boss && bullet.checkCollision(boss)) {
                if (boss.hit()) {
                    boss = null;
                    bossActive = false;
                    setTimeout(() => levelComplete(), 2000);
                }
                bullets.splice(i, 1);
            }
        } else if (bullet.source === 'enemy') {
            // Oyuncuya çarpan mermiler
            if (bullet.checkCollision(player) && !player.invulnerable) {
                player.hit();
                bullets.splice(i, 1);
            }
        }
    }
}

function handleEnemyPlayerCollisions() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const dx = enemy.x + enemy.width/2 - (player.x + player.width/2);
        const dy = enemy.y + enemy.height/2 - (player.y + player.height/2);
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < (enemy.width + player.width)/2) {
            if (!player.invulnerable) player.hit();
            if (enemy.hit()) enemies.splice(i, 1);
        }
    }
}

function handlePowerupCollection() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        if (powerups[i].checkCollision(player)) {
            powerups[i].collect();
            powerups.splice(i, 1);
        }
    }
}

function handleBossCollisions() {
    const dx = boss.x + boss.width/2 - (player.x + player.width/2);
    const dy = boss.y + boss.height/2 - (player.y + player.height/2);
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    if (distance < (boss.width + player.width)/3 && !player.invulnerable) {
        player.hit();
    }
}

function checkWaveProgress() {
    if (!bossActive && enemies.length === 0 && missionProgress >= missionTarget) {
        nextWave();
    }
}

function renderGame() {
    // Arka plan çizimi
    drawBackground();
    
    // Tüm varlıkları çiz
    drawEntities();
    
    // Ekran sarsıntısını sıfırla
    if (screenShake > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}

function drawEntities() {
    // Çizim sırası: arka plandakiler önce çizilir
    particles.forEach(p => p.draw());
    powerups.forEach(p => p.draw());
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    
    if (bossActive && boss) {
        boss.draw();
    }
    
    player.draw();
}
    
    function drawBackground() {
        // Arka plan gradienti
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a1736');
        gradient.addColorStop(1, '#030412');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Yıldızlar
        ctx.fillStyle = 'white';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2;
            const alpha = Math.random() * 0.8 + 0.2;
            
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    function nextWave() {
        wave++;
        
        // Seviye kontrolü (her 3 dalgada bir seviye artışı)
        if (wave % 3 === 0) {
            levelComplete();
            return;
        }
        
        // Sonraki dalga için hedefi güncelle
        missionProgress = 0;
        missionTarget = Math.min(10 + (wave * 5), 50);
        updateMissionTarget();
        
        // Dalga duyurusunu göster
        showWaveAnnouncement();
    }
    
    function showWaveAnnouncement() {
        document.getElementById('wave-number').textContent = wave;
        document.getElementById('wave-announcement').classList.add('active');
        
        setTimeout(() => {
            document.getElementById('wave-announcement').classList.remove('active');
        }, 2000);
    }
    
    function levelComplete() {
        isTransitioning = true;
        
        // Level tamamlama bonusu
        const bonus = level * 100;
        document.getElementById('completed-level').textContent = level;
        document.getElementById('level-bonus').textContent = bonus;
        
        level++;
        wave = 1;
        updateScore(bonus);
        updateLevel();
        
        // Level geçiş ekranını göster
        showScreen('next-level-screen');
    }
    
    function startNextLevel() {
        isTransitioning = false;
        
        // UI'ı güncelle
        missionProgress = 0;
        missionTarget = 10 + (level * 5);
        updateMissionTarget();
        
        // Oyuncu pozisyonunu sıfırla
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - player.height - 20;
        
        // Nesneleri temizle
        enemies = [];
        bullets = [];
        powerups = [];
        
        // Boss seviyesi kontrolü (her 3. seviye boss seviyesi)
        if (level % 3 === 0) {
            startBossFight();
        }
        
        // Ekranları gizle
        document.querySelectorAll('.screen-overlay').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Oyun durumunu güncelle
        gamePaused = false;
        
        // Dalga duyurusunu göster
        showWaveAnnouncement();
    }
    
    function startBossFight() {
        bossActive = true;
        
        // Boss tipini belirle
        let bossType = 'emperor';
        if (level >= 6) {
            bossType = 'destroyer';
        }
        
        boss = new Boss(bossType);
    }
    
    function gameOver() {
    // Oyun durumunu tamamen durdur
    gameRunning = false;
    gamePaused = false;
    
    // Tüm düşmanları ve mermileri temizle
    enemies = [];
    bullets = [];
    particles = [];
    powerups = [];
    
    // Boss durumunu sıfırla
    bossActive = false;
    boss = null;
    
    // Son skoru göster
    document.getElementById('final-score').textContent = score;
    
    // Yüksek skor kontrolü
    checkHighScore(score);
    
    // Yüksek skorları göster
    displayHighScores();
    
    // Oyun bitti ekranını göster
    showScreen('game-over-screen');
}

function gameLoop(timestamp) {
    // Delta zaman hesaplama
    const now = Date.now();
    deltaTime = now - lastTime;
    lastTime = now;

    // Oyun çalışmıyorsa döngüyü durdur
    if (!gameRunning) {
        return;
    }

    // Oyun durum kontrolü
    if (gamePaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (isTransitioning) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Ekran temizleme ve sarsıntı efekti
    handleScreenEffects();

    // Oyun durum güncellemeleri
    updateGameState();

    // Çarpışma kontrolleri
    handleCollisions();

    // Render işlemleri
    renderGame();

    // Bir sonraki kare
    requestAnimationFrame(gameLoop);
}
    
    function restartGame() {
    // Oyunu tamamen sıfırlayarak başlat (zorluk seviyesi ayarlardan alınacak)
    gameRunning = false;
    gamePaused = false;
    
    // Tüm ekranları gizle
    document.querySelectorAll('.screen-overlay').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Oyunu başlatmadan önce kısa bir gecikme ekleyelim
    setTimeout(() => {
        startGame();
    }, 100);
}

function startGame() {
    console.log("Oyun başlatılıyor...");
    
    // Canvas ve context'i tekrar al
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Oyun değişkenlerini sıfırla (zorluk seviyesini ayarlardan al)
    score = 0;
    lives = 3;
    level = 1;  // Seviyeyi her zaman 1'den başlat
    wave = 1;   // Dalgayı her zaman 1'den başlat
    missionProgress = 0;
    missionTarget = 10;
    gameRunning = true;
    gamePaused = false;
    bossActive = false;
    boss = null;
    isTransitioning = false;
    
    // UI'ı güncelle
    updateScore(0);
    updateLives();
    updateLevel();
    updateMissionTarget();
    
    // Oyuncu, düşman ve mermi dizilerini sıfırla
    player = new Player();
    enemies = [];
    bullets = [];
    particles = [];
    powerups = [];
    
    // Boss UI'ını gizle
    document.getElementById('boss-health-container').classList.remove('active');
    
    // Ekranları gizle
    document.querySelectorAll('.screen-overlay').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Oyun döngüsünü başlat
    lastTime = Date.now();
    requestAnimationFrame(gameLoop);
    
    // Dalga duyurusunu göster
    showWaveAnnouncement();
    
    console.log("Oyun başlatıldı!");
}
    
    function togglePause() {
        gamePaused = !gamePaused;
        
        if (gamePaused) {
            showScreen('pause-screen');
        } else {
            document.querySelectorAll('.screen-overlay').forEach(screen => {
                screen.classList.remove('active');
            });
            lastTime = Date.now(); // Delta zamanı sıfırla
            requestAnimationFrame(gameLoop);
        }
    }
    
    function resumeGame() {
        gamePaused = false;
        document.querySelectorAll('.screen-overlay').forEach(screen => {
            screen.classList.remove('active');
        });
        lastTime = Date.now(); // Delta zamanı sıfırla
        requestAnimationFrame(gameLoop);
    }
    
    function updateScore(points) {
        score += points;
        document.getElementById('score-value').textContent = score;
        
        // Level ilerlemesini güncelle
        const progressPercent = (missionProgress / missionTarget) * 100;
        document.getElementById('level-progress-fill').style.width = progressPercent + '%';
    }
    
    function updateLives() {
        const livesContainer = document.getElementById('lives-container');
        livesContainer.innerHTML = '';

        for (let i = 0; i < lives; i++) {
            const lifeElement = document.createElement('img');
            lifeElement.src = 'images/heart.png'; // Can resmi
            lifeElement.alt = 'Can';
            lifeElement.style.width = '30px'; // Resim boyutu
            lifeElement.style.height = '30px';
            lifeElement.style.marginRight = '5px';
            livesContainer.appendChild(lifeElement);
        }
    }
    
    function updateLevel() {
        document.getElementById('level-value').textContent = level;
    }
    
    function updateMissionTarget() {
        const missionIndicator = document.getElementById('mission-indicator');
        if (missionIndicator) {
            missionIndicator.textContent = `Görev: ${missionTarget} düşman yok et`;
            updateMissionProgress();
        } else {
            console.error("Mission indicator element not found!");
        }
    }
    
    function updateMissionProgress() {
        const missionProgressElement = document.getElementById('mission-progress');
        if (missionProgressElement) {
            missionProgressElement.textContent = `${missionProgress}/${missionTarget}`;
        } else {
            console.error("Mission progress element not found!");
        }
    }
    
    function updateBossHealth() {
        if (boss) {
            const healthPercent = (boss.health / boss.maxHealth) * 100;
            document.getElementById('boss-health-bar').style.width = healthPercent + '%';
        }
    }
    
    function activatePowerup(text, duration) {
        // Powerup göstergesini güncelle
        document.getElementById('powerup-text').textContent = text;
        document.getElementById('powerup-indicator').classList.add('active');
        document.getElementById('powerup-timer').classList.add('active');
        
        // Zamanlayıcıyı başlat
        powerupTimer = duration;
        
        // Zamanlayıcı güncelleme fonksiyonu
        const updateTimer = () => {
            if (powerupTimer <= 0) {
                document.getElementById('powerup-indicator').classList.remove('active');
                document.getElementById('powerup-timer').classList.remove('active');
                return;
            }
            
            powerupTimer -= 100;
            const percent = (powerupTimer / duration) * 100;
            document.getElementById('powerup-timer-fill').style.width = percent + '%';
            
            setTimeout(updateTimer, 100);
        };
        
        updateTimer();
    }
    
    function saveSettings() {
        // Ayarları al
        gameSettings.masterVolume = parseFloat(document.getElementById('master-volume').value);
        gameSettings.sfxVolume = parseFloat(document.getElementById('sfx-volume').value);
        gameSettings.musicVolume = parseFloat(document.getElementById('music-volume').value);
        gameSettings.difficulty = parseInt(document.querySelector('input[name="difficulty"]:checked').value);
        gameSettings.graphicsQuality = parseInt(document.getElementById('graphics-quality').value);
        
        // Ayarları kaydet (localStorage)
        localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
        
        // Ayarları ekranını kapat ve önceki ekrana dön
        if (gameRunning) {
            if (gamePaused) {
                showScreen('pause-screen');
            } else {
                document.querySelectorAll('.screen-overlay').forEach(screen => {
                    screen.classList.remove('active');
                });
            }
        } else {
            showScreen('start-screen');
        }
    }
    
    function loadSettings() {
        // Kayıtlı ayarları yükle
        const savedSettings = localStorage.getItem('gameSettings');
        if (savedSettings) {
            gameSettings = JSON.parse(savedSettings);
            
            // Ayarları UI'a yansıt
            document.getElementById('master-volume').value = gameSettings.masterVolume;
            document.getElementById('sfx-volume').value = gameSettings.sfxVolume;
            document.getElementById('music-volume').value = gameSettings.musicVolume;
            document.getElementById('graphics-quality').value = gameSettings.graphicsQuality;
            
            // Zorluk seviyesini ayarla
            document.getElementById(`difficulty-${getDifficultyName(gameSettings.difficulty)}`).checked = true;
        }
    }
    
    function getDifficultyName(level) {
        switch(level) {
            case 1: return 'easy';
            case 2: return 'medium';
            case 3: return 'hard';
            default: return 'medium';
        }
    }
    
    function closeSettings() {
        if (gameRunning) {
            showScreen('pause-screen');
        } else {
            showScreen('start-screen');
        }
    }
    
    function checkHighScore(score) {
        // Yüksek skorları kontrol et
        highScores.push({
            score: score,
            date: new Date().toLocaleDateString()
        });
        
        // Skorları sırala
        highScores.sort((a, b) => b.score - a.score);
        
        // En fazla 5 skor tut
        // Yüksek skorları kaydet
        localStorage.setItem('highScores', JSON.stringify(highScores));
    }
    
    function loadHighScores() {
        // Kayıtlı yüksek skorları yükle
        const savedScores = localStorage.getItem('highScores');
        if (savedScores) {
            highScores = JSON.parse(savedScores);
        }
    }
    
    function displayHighScores() {
        const container = document.getElementById('highscores-list');
        container.innerHTML = '';
        
        if (highScores.length === 0) {
            container.innerHTML = '<div class="highscore-item">Henüz yüksek skor yok!</div>';
            return;
        }
        
        // Skorları listele
        highScores.forEach((item, index) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'highscore-item';
            
            const rank = document.createElement('span');
            rank.className = 'highscore-rank';
            rank.textContent = `${index + 1}.`;
            
            const date = document.createElement('span');
            date.textContent = item.date;
            
            const value = document.createElement('span');
            value.className = 'highscore-value';
            value.textContent = item.score;
            
            scoreItem.appendChild(rank);
            scoreItem.appendChild(date);
            scoreItem.appendChild(value);
            
            container.appendChild(scoreItem);
        });
    }
    
    // Oyunu başlat
    window.onload = function() {
        console.log("Sayfa yüklendi, oyun başlatılıyor...");
        initGame();
        loadSettings();
    };