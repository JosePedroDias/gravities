(function() {
    'use strict';



    /***************
     * GLOBAL VARS *
     ***************/
    var W = 400;
    var H = 400;
    var SCALE = 1;

    var     DT = 1 / 30;
    var PREV_T = 0 - DT;
    var      T = 0;

    var KEYS = {};
    var K_UP    = 38;
    var K_DOWN  = 40;
    var K_LEFT  = 37;
    var K_RIGHT = 39;
    var K_SPACE = 32;
    var K_SHIFT = 'SHIFT';
    var K_ALT   = 'ALT';
    var K_CTRL  = 'CTRL';



    var b2Vec2         = Box2D.Common.Math.b2Vec2;
    var b2World        = Box2D.Dynamics.b2World;
    var b2BodyDef      = Box2D.Dynamics.b2BodyDef;
    var b2Body         = Box2D.Dynamics.b2Body;
    var b2FixtureDef   = Box2D.Dynamics.b2FixtureDef;
    var b2CircleShape  = Box2D.Collision.Shapes.b2CircleShape;
    var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
    /*var b2Fixture      = Box2D.Dynamics.b2Fixture;
    var b2MassData     = Box2D.Collision.Shapes.b2MassData;*/



    var raf = window.requestAnimationFrame       ||
              window.mozRequestAnimationFrame    ||
              window.webkitRequestAnimationFrame ||
              window.msRequestAnimationFrame;

    var log = function() {
        window.console.log.apply(window.console, arguments);
    };

    var trueishKeys = function(o) {
        var res = [];
        for (var k in o) {
            if (o[k]) { res.push(k); }
        }
        return res.join(' ');
    };



    /****************************
     * VECTOR GRAPHICS WITH SVG *
     ****************************/
    var S = Snap;
    var s = S(W, H);

    var fpsText = s.text(10, 20, 'FPS: ');
    fpsText.attr({'font-family': 'sans-serif'});

    var createRect = function(dims) {
        var r = s.rect(-dims[0]/2, -dims[1]/2, dims[0], dims[1]); // x, y, w, h
        var g = s.g(r);
        var api = {
            setPosRot: function(pos, rot) {
                if (pos !== undefined) { this._pos = pos; }
                if (rot !== undefined) { this._rot = rot; }
                g.transform(
                    S.matrix()
                        .translate(this._pos[0], this._pos[1])
                        .rotate(this._rot)
                );
            },
            translate: function(deltaPos, skipApplication) {
                this._pos[0] += deltaPos[0];
                this._pos[1] += deltaPos[1];
                if (!skipApplication) { this.setPosRot(); }
            },
            rotate: function(deltaRot, skipApplication) {
                this._rot += deltaRot;
                if (!skipApplication) { this.setPosRot(); }
            },
            attr: function() {
                r.attr.apply(r, arguments);
            }
        };
        return api;
    };

    var createCircle = function(radius) {
        var c = s.circle(0, 0, radius); // cx, cy, r
        var g = s.g(c);
        var api = {
            setPosRot: function(pos, rot) {
                if (pos !== undefined) { this._pos = pos; }
                if (rot !== undefined) { this._rot = rot; }
                g.transform(
                    S.matrix()
                        .translate(this._pos[0], this._pos[1])
                        .rotate(this._rot)
                );
            },
            translate: function(deltaPos, skipApplication) {
                this._pos[0] += deltaPos[0];
                this._pos[1] += deltaPos[1];
                if (!skipApplication) { this.setPosRot(); }
            },
            rotate: function(deltaRot, skipApplication) {
                this._rot += deltaRot;
                if (!skipApplication) { this.setPosRot(); }
            },
            attr: function() {
                c.attr.apply(c, arguments);
            }
        };
        return api;
    };



    var planet = createCircle(100);
    planet.setPosRot([200, 200], 0);
    planet.attr({fill:'red'});

    var player = createRect([20, 20]);
    player.setPosRot([200, 200-100-10], 45);
    player.attr({fill:'green'});



    var ball = createCircle(10);
    ball.setPosRot([0, 0], 0);
    ball.attr({fill:'blue'});



    var world = new b2World( new b2Vec2(0, 10), true); // gravityVec, doSleep

    var ground;
    (function() {
        // ground
        var fixDef = new b2FixtureDef();
        fixDef.density     = 1.0;
        fixDef.friction    = 0.5;
        fixDef.restitution = 0.2;

        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_staticBody;
        bodyDef.position.x = W/SCALE;
        bodyDef.position.y = H/SCALE;

        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsBox((W/SCALE)/2, (10/SCALE)); // half w, half h
        
        ground = world.CreateBody(bodyDef).CreateFixture(fixDef);
    })();
    ground.m_body.SetPosition( new b2Vec2(W/SCALE/2, (H+10)/SCALE) );

    (function() {
        // ball
        var fixDef = new b2FixtureDef();
        fixDef.density     = 1.0;
        fixDef.friction    = 0.5;
        fixDef.restitution = 0.2;

        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_dynamicBody;
        bodyDef.position.x = 0 / SCALE;
        bodyDef.position.y = 0 / SCALE;

        fixDef.shape = new b2PolygonShape();
        //fixDef.shape.SetAsBox((600 / SCALE) / 2, (10/SCALE) / 2); // half w, half h
        fixDef.shape = new b2CircleShape(10/SCALE); // r

        var b = world.CreateBody(bodyDef).CreateFixture(fixDef);
        ball._b = b;
    })();
    ball._b.m_body.SetPosition( new b2Vec2(W/SCALE/2, 10/SCALE) );
    // ball._b.m_body.SetPosition( new b2Vec2(0/SCALE, 0/SCALE) );



    var onFrame = function onFrame(t) {
        T = t * 0.001;
        DT = T - PREV_T;

        var playerUpdated = false;
        var spdL = 40;
        var spdR = 90;
        
        if (KEYS[K_LEFT]) {  player.translate([-DT*spdL, 0], true); playerUpdated = true; }
        if (KEYS[K_RIGHT]) { player.translate([ DT*spdL, 0], true); playerUpdated = true; }
        if (KEYS[K_UP]) {    player.translate([0, -DT*spdL], true); playerUpdated = true; }
        if (KEYS[K_DOWN]) {  player.translate([0,  DT*spdL], true); playerUpdated = true; }
        
        if (KEYS[K_SPACE]) { player.rotate((KEYS[K_SHIFT]?-1:1)*DT*spdR, true); playerUpdated = true; }
        
        if (playerUpdated) { player.setPosRot(); /*log('player pos:', player._pos);*/ }

        world.Step(DT*2, 10, 10); // step duration in secs, vel iters, pos iters
        var p = ball._b.m_body.GetPosition();
        ball.setPosRot([p.x, p.y]);
        world.ClearForces();

        fpsText.attr({text:'FPS: ' + Math.round(1 / DT) });

        //log( 't:', T.toFixed(3), ' dt:', DT.toFixed(3) );
        raf(onFrame);
        PREV_T = T;
    };
    raf(onFrame);



    /*********************
     * KEYBOARD HANDLING *
     *********************/
    var onKey = function(ev) {
        var kc = ev.keyCode;
        KEYS[kc] = (ev.type === 'keydown');
        KEYS[K_SHIFT] = ev.shiftKey;
        KEYS[K_ALT]   = ev.altKey;
        KEYS[K_CTRL]  = ev.ctrlKey;
        //log('keys:', KEYS);
        log('keys:', trueishKeys(KEYS));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup',   onKey);

})();
