'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error('Можно прибавлять к вектору только вектор типа Vector.');
    }      
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  times(multiplier) {
    return new Vector(this.x * multiplier, this.y * multiplier);
  }
}

class Actor {
  constructor(pos, size, speed) {
    if (!pos) {
      pos = new Vector(0, 0);
    }
    if (!size) {
      size = new Vector(1, 1);
    }
    if (!speed) {
      speed = new Vector(0, 0);
    }

    if (!(pos instanceof Vector)) {
      throw new Error('Расположение не является объектом типа Vector');
    }
    if (!(size instanceof Vector)) {
      throw new Error('Размер не является объектом типа Vector');
    }
    if (!(speed instanceof Vector)) {
      throw new Error('Скорость не является объектом типа Vector');
    }

    this.pos = pos;
    this.size = size;
    this.speed = speed;  
  }
  
  act() {};

  get left() {
    return this.pos.x;
  }
  get top() {
    return this.pos.y;
  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }
  
  get type() {
    return 'actor';
  }

   isIntersect(actor) {
    if (!(actor instanceof Actor) || !actor) {
      throw new Error('Нужен объект типа Actor.');
    } 
    if (actor === this) {
      return false;
    }
    return actor.left < this.right 
      && actor.right > this.left 
      && actor.top < this.bottom 
      && actor.bottom > this.top;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.player = this.actors.find(actor => actor.type === 'player');
    this.status = null;
    this.finishDelay = 1;
  }

  get height() {
    return this.grid.length;
  }
  get width() {
    return this.grid.reduce(function(memo, el) {
      if (el.length > memo) {
        return el.length;
      } else return memo;
    }, 0);
  }

  isFinished() {
    return this.status != null && this.finishDelay < 0;
  }

  actorAt(actor) {
    if (!(actor instanceof Actor) || !actor) {
      throw new Error('Нужен объект типа Actor.');
    }
    return this.actors.find(el => el.isIntersect(actor));
  }

  obstacleAt(position, size) {
    if (!(position instanceof Vector) 
      || !(size instanceof Vector) 
      || !position || !size) {
      throw new Error('Нужен объект типа Vector.');
    }
 
    const left = Math.floor(position.x);
    const right = Math.ceil(position.x + size.x);
    const top = Math.floor(position.y);
    const bottom = Math.ceil(position.y + size.y);

    if (left < 0 
      || right > this.width 
      || top < 0) {
      return 'wall';
    } 
    if (bottom > this.height) {
      return 'lava';
    }
    
    for (let i = top; i < bottom; i++) {
      for (let j = left; j < right; j++) {
        const gridLevel = this.grid[i][j];
        if (gridLevel) {
          return gridLevel;
        }
      }
    }
  }

  removeActor(actor) {
    if (this.actors.includes(actor)) {
      this.actors.splice(this.actors.indexOf(actor), 1);
    }
  }

  noMoreActors(type) {
    return this.actors.findIndex(elem => elem.type === type) === -1;
  }

  playerTouched(type, actor) {
    if (this.status !== null) {
      return;
    }
    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
      return;
    }
    if (type === 'coin' && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
      return;
    }
  }
}

const FIXED = {
  'x': 'wall',
  '!': 'lava'
};

class LevelParser {
  constructor(glossary) {
    this.glossary = glossary;
  }

  actorFromSymbol(sign) {
    if (sign && this.glossary)
    return this.glossary[sign];
  }

  obstacleFromSymbol(sign) {
    if (!sign) return undefined;
    return FIXED[sign];    
  }

  createGrid(plan) {
    return plan.map(function(row) {
      return [...row].map(el => FIXED[el]);
    });
  }
  
  createActors(plan) {
    let thisPlan = this;
    return plan.reduce(function(prev, rowY, y) {
      [...rowY].forEach(function(rowX, x) {
        if (rowX) {
          let constructor = thisPlan.actorFromSymbol(rowX);
          if (constructor && typeof constructor === 'function') {
            let actor = new constructor (new Vector(x, y));
            if (actor instanceof Actor) {
              prev.push(actor);
            }
          }
        }
      });
      return prev;
    }, []);
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    let size = new Vector(1, 1);
    super(pos, size, speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    let nextPosition = this.getNextPosition(time);
    if (level.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    let speed = new Vector(2, 0);
    super(pos, speed);
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    let speed = new Vector(0, 2);
    super(pos, speed);
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    let speed = new Vector(0, 3);
    super(pos, speed);
    this.startPos = pos;
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

class Coin extends Actor {
  constructor(pos) {
    if (!pos) {
      pos = new Vector(0, 0);
    }
    pos = pos.plus(new Vector(0.2, 0.1));
    let size = new Vector(0.6, 0.6);
    super(pos, size);

    this.startPos = pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.startPos.plus(this.getSpringVector());
  }

  act(time = 1) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos) {
    if (!pos) {
      pos = new Vector(0, 0);
    }
    pos = pos.plus(new Vector(0, -0.5));
    let size = new Vector(0.8, 1.5);
    let speed = new Vector(0, 0);
    super(pos, size, speed);
  }

  get type() {
    return 'player';
  }
}

const actorDict  = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': FireRain
};

const parser = new LevelParser(actorDict);

loadLevels()
  .then((res) => {
    runGame(JSON.parse(res), parser, DOMDisplay)
      .then(() => alert('Вы выиграли!'))
  });
