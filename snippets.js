/*********************************************************
 * wrote/adapted these but haven't used them in the game *
 *********************************************************/


/*var ctctListener = new ContactListener();
var updateContacts = function(remove) {
    return function(contact) {
        var a = contact.GetFixtureA().GetBody().GetUserData();
        var b = contact.GetFixtureB().GetBody().GetUserData();
        var t;
        if (a > b) { t = a; a = b; b = t;  } // swap to keep alphabetical order
        CONTACTS[a+'_'+b] = !remove;
    };
};
ctctListener.BeginContact = updateContacts(false);
ctctListener.EndContact   = updateContacts(true);
ctctListener.PreSolve = function(contact, oldManifold) {
};
ctctListener.PostSolve = function(contact, impulse) {
    if (contact.GetFixtureA().GetBody().GetUserData() == 'ball' || contact.GetFixtureB().GetBody().GetUserData() == 'ball') {
        var impulse = impulse.normalImpulses[0];
        if (impulse < 0.2) return; //threshold ignore small impacts
        world.ball.impulse = impulse > 0.6 ? 0.5 : impulse;
        console.log(world.ball.impulse);
    }
};
WORLD.SetContactListener(ctctListener);*/


/*
// if callback returns true, operation continues (query/raycast...)
WORLD.QueryAABB(function(fixture) {}); // cb, AABB
WORLD.QueryPoint(function(fixture) {}, p); // cb, Vec2
WORLD.QueryShape(function(fixture) {}, shp, trans)) // cb, Shape, [Transform]
WORLD.RayCast(function(fixture) {}, p1, p2) // cb, p1, p2
WORLD.RayCastOne(p1, p2) // -> Fixture
WORLD.RayCastAll(p1, p2) // -> Fixture[]
*/



/*WORLD.QueryPoint(
    function(fixture) {
        log('point', fixture.GetBody().GetUserData());
    },
    new Vec2(200, 200-100-5)
);*/



/*var aabb = new AABB();
aabb.lowerBound.Set(200+103,    200-10);
aabb.upperBound.Set(200+103+20, 200+10);
WORLD.QueryAABB(
    function(fixture) {
        log('aabb', fixture);
    },
    aabb
);*/



/*var mtx = new Mat22();
mtx.SetIdentity();
WORLD.QueryShape(
    function(fixture) {
        log('shape', fixture.GetBody().GetUserData());
    },
    new CircleShape(10),
    new Transform( new Vec2(200-100-12, 200), mtx)
);*/
