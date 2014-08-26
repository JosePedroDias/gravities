(function() {
    'use strict';



    /***************
     * GLOBAL VARS *
     ***************/
    //var DEG2RAD = 180 / Math.PI;
    var SCREEN_DIMS;



    /****************************
     * VECTOR GRAPHICS WITH SVG *
     ****************************/
    var s;
    var onResize = function() {
        //if (hasTouch) { // HACK
        //    SCREEN_DIMS = [screen.availWidth, screen.availHeight];
        //}
        //else {
            SCREEN_DIMS = [window.innerWidth, window.innerHeight];
        //}

        //log('resize', SCREEN_DIMS);
        if (s) {
            s.attr({
                width:  SCREEN_DIMS[0],
                height: SCREEN_DIMS[1]
            });
        }
    };
    onResize();



    var S = Snap;
    s = S(SCREEN_DIMS[0], SCREEN_DIMS[1]);

    var rootEl = s.g();

    var a = s.rect(20, 40, 30, 30);
    a.attr({fill:'red'});
    rootEl.append(a);

})();
