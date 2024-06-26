class Monster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, monsterInfo, player) {
    super(scene, x, y, monsterInfo.spriteKey);
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
    this.player = player;

    //기본 속성 초기화
    this.spriteKey = monsterInfo.spriteKey;
    this.animations = monsterInfo.animations;
    this.health = monsterInfo.health || 100;
    this.speed = monsterInfo.speed || 20;
    this.scale = monsterInfo.scale || 1;
    this.lastSkillTime = 0;
    this.skill = monsterInfo.skill || 0;
    this.type = monsterInfo.type || "nomal";
    this.attackRange = monsterInfo.attackRange || 300; // 공격 범위
    this.attackCooldown = monsterInfo.attackCooldown || 0; // 공격 쿨다운
    this.lastAttackTime = 0; // 마지막 공격 시간 초기화
    this.isAttacking = false; 


    this.reverseFlip = monsterInfo.reverseFlip || false;

    this.setScale(this.scale);
    this.setDepth(1);
    this.setupAnimations(); 
  }
 

  setupAnimations() {
    Object.keys(this.animations).forEach(key => {
      const anim = this.animations[key];
      const fullAnimKey = this.spriteKey + '_' + key;
      if (!this.scene.anims.exists(fullAnimKey)) {
        this.scene.anims.create({
          key: fullAnimKey,
          frames: this.scene.anims.generateFrameNumbers(this.spriteKey, { 
            start: anim.frames.start, 
            end: anim.frames.end 
          }),
          frameRate: anim.framerate,
          repeat: anim.repeat
        });
      }
    });
    this.play(this.spriteKey + '_move');
  }

  update() {
    if(this.type === "ghost"){
      if (this.scene.time.now > this.lastSkillTime  + this.skill) {
        this.Vanishing();
        this.lastSkillTime  = this.scene.time.now;
      }
    }
    const speed = this.speed;
    // 플레이어와 몬스터 사이의 거리를 계산합니다.
    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 플레이어를 향해 천천히 이동합니다.
    this.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    if(this.attackCooldown != 0){
      if (distance <= this.attackRange && !this.isAttacking && this.scene.time.now > this.lastAttackTime + this.attackCooldown) {
        this.attack();
      }
    }

    if (this.reverseFlip) {
        this.setFlipX(this.player.x > this.x);
    } else {
        this.setFlipX(this.player.x < this.x);
    }
  }

  attack() {
    this.isAttacking = true;
    this.lastAttackTime = this.scene.time.now;
    this.play(this.spriteKey + '_attack');

    this.on('animationupdate', (animation, frame) => {
      if (frame.index === 3 && this.isAttacking) { // 공격 애니메이션의 특정 프레임에서 공격 실행
        this.attackAction();
      }
    });

    this.once('animationcomplete', () => {
      this.isAttacking = false;
      this.play(this.spriteKey + '_move');
    });
  }

  attackAction() {
    const missile = new Missile(this.scene, this.x, this.y, 'missile');
    this.scene.masterController.monsterController.missilesGroup.add(missile);
    missile.fire(this.x, this.y, Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y)));
  }
  // 이 부분 지금 플레이어와 몬스터가 부딪히면 몬스터가 데미지를 받네요..
  checkCollision(monster, player) {
    const masterController = this.scene.masterController;
    masterController.characterTakeDamage(10);
  }

  // 몬스터 깜빡이기
  blink() {
    this.isBlinking = true;
    this.setVisible(!this.visible); // 스프라이트 가시성을 토글

    // 일정 시간 후에 깜빡임 멈추도록 타이머 설정
    this.scene.time.delayedCall(2000, () => {
      this.stopBlink(); // 깜빡임 중지
    });

    // 일정 시간마다 깜빡이도록 타이머 설정
    this.blinkTimer = this.scene.time.addEvent({
      delay: 200, // 깜빡임 간격
      callback: () => {
        this.setVisible(!this.visible); // 스프라이트 가시성을 토글
      },
      callbackScope: this,
      loop: true, // 무한 반복
    });
  }

  // 깜빡임 멈추기
  stopBlink() {
    this.isBlinking = false;
    this.setVisible(true); // 몬스터 가시성을 다시 활성화
    if (this.blinkTimer) {
      this.blinkTimer.remove(); // 깜빡임 타이머 제거
    }
  }

  //몬스터 은신기능
  Vanishing() {
    this.setVisible(false); // 몬스터를 화면에서 숨김
    this.isVanishing = true; // Vanishing 상태로 설정

    // 일정 시간 후에 몬스터를 다시 나타나게 함
    this.scene.time.delayedCall(800, () => {
        this.setVisible(true); // 몬스터를 다시 보이게 함
        this.isVanishing = false; // Vanishing 상태 해제
    });
  }

  hit(damage) {
    this.health -= damage;

    this.monsterback();
    if (!this.isBlinking) {
      this.blink(); // 깜빡임 효과 시작
    }

    if (this.health <= 0) {

      this.destroyMonster();
    }
  }

  monsterback() {
    const knockbackDistance = 50; // 넉백 거리를 설정하세요.

    // 플레이어와 몬스터 사이의 방향 벡터 계산
    const directionX = this.x - this.player.x;
    const directionY = this.y - this.player.y;

    // 방향 벡터를 정규화하여 거리가 1인 벡터로 변환
    const distance = Math.sqrt(
      directionX * directionX + directionY * directionY
    );
    const normalizedDirectionX = directionX / distance;
    const normalizedDirectionY = directionY / distance;

    // 넉백할 위치 계산
    const knockbackX = this.x + normalizedDirectionX * knockbackDistance;
    const knockbackY = this.y + normalizedDirectionY * knockbackDistance;

    // 넉백 적용
    this.setPosition(knockbackX, knockbackY);
  }

  //플레이어 Status

  dropRate(){
    //현 확률 luck 90 일경우 상자 드랍률 2%
    const masterController = this.scene.masterController;
    const playerStatus = masterController.getCharacterStatus();
    const playerLuck = playerStatus.luck;

    //기본 드랍 확률 0.5%
    const baseDropDate = 0.005;

    //드랍률 증가량
    const growthFactor = 1.5874;

    //30기준으로 한단계 증가
    const scale = playerLuck / 30;

    const totalDropRate = baseDropDate * Math.pow(growthFactor, scale);

    return totalDropRate;
  }

  destroyMonster() {
    const boxRate= this.dropRate();

    //몬스터 죽은 횟수 올리기
    this.scene.masterController.gameDataManager.updateMonstersKilled();

    // 경험치 구슬 생성
    for (let i = 0; i < 2; i++) {
      const expBead = new ExpBead(this.scene, this.x, this.y);
      this.scene.masterController.monsterController.expBeadsGroup.add(expBead);
    }
    // 확률적으로 보너스 상자 생성
    if (Math.random() <= boxRate) {
      const bonusBox = new BonusBox(this.scene, this.x, this.y);
      this.scene.masterController.monsterController.bonusBoxGroup.add(bonusBox);
    }

    this.destroy();
  }
}