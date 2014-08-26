(function() {
    'use strict';



    /***************
     * GLOBAL VARS *
     ***************/
    var SCREEN_DIMS;
    //var ENTITIES = [];



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



})();
