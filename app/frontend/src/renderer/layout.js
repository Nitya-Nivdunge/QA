(function () {
    'use strict';

    var SW = 1024;     // LShape screen width
    var SH = 768;      // LShape screen height
    var RC = 180;      // right column
    var BRH = 200;     // bottom panel height

    function getMode(vw, vh) {

        // TRUE L-Shape only on large screens
        if (vw >= (SW + RC + 50) && vh >= (SH + BRH + 50)) {
            return "lshape";
        }

        // Otherwise fallback
        return "twocol";
    }

    function apply() {
        var vw = window.innerWidth;
        var vh = window.innerHeight;

        var mode = getMode(vw, vh);
        document.documentElement.dataset.layout = mode;

        console.log("[Layout]", vw, "x", vh, "→", mode);
    }

    document.addEventListener("DOMContentLoaded", () => {
        requestAnimationFrame(() => requestAnimationFrame(apply));

        let timer;
        window.addEventListener("resize", function () {
            clearTimeout(timer);
            timer = setTimeout(apply, 80);
        });

        window._atmApplyLayout = apply;
    });
})();