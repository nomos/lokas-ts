import {dice} from "./dice";
import {math} from "./math";

const LuminanceC={
    r:0.299,
    g:0.587,
    b:0.114
};

export const shaderHSL2RGB =
    `
        vec4 hsl2rgb (float h,float s,float l){
            if (s==0.0) {
                return vec4(l,l,l,1.0);
            }
            float sector = h*6.0;
            float i = floor(sector);
            float f = sector-i;
            float p = l * (1.0 - s);
            float q = l * (1.0 - s * f);
            float t = l * (1.0 - s * (1.0 - f));
            vec4 color = vec4(0.0,0.0,0.0,1.0);
            if (i==0.0) {
                color.r = l;
                color.g = t;
                color.b = p;
            } else if (i==1.0) {
                color.r = q;
                color.g = l;
                color.b = p;
            } else if (i==2.0) {
                color.r  = p;
                color.g  = l;
                color.b  = t;
            } else if (i==3.0) {
                color.r  = p;
                color.g  = q;
                color.b  = l;
            } else if (i==4.0) {
                color.r  = t;
                color.g  = p;
                color.b  = l;
            } else {
                color.r  = l;
                color.g  = p;
                color.b  = q;
            }
            return color;
        }
    `;

export class Color{
    protected _r:number
    protected _g:number
    protected _b:number
    protected _h:number
    protected _s:number
    protected _l:number
    constructor () {
        let args = [].slice.call(arguments);
        let failed = this.setColor.apply(this, args);
        if (failed) {
            this.reset();
        }
    }

    random() {
        this._r=dice.rngInt(0,255);
        this._g=dice.rngInt(0,255);
        this._b=dice.rngInt(0,255);
        this.calHSL();
    }

    reset() {
        this._r=128;
        this._g=128;
        this._b=128;
        this.calHSL();
    }

    calHSL() {
        let c=Colors.rgb2hsl(this._r, this._g, this._b);
        this._h=c[0];
        this._s=c[1];
        this._l=c[2];
    }

    calRGB() {
        let c=Colors.hsl2rgb(this._h, this._s, this._l);
        this._r=c[0];
        this._g=c[1];
        this._b=c[2];
    }

    toCCColorfunction () {
        return cc.color(this._r,this._g,this._b,255);
    }

    setColor(v) {
        let args=[].slice.call(arguments);
        while (args[args.length-1]===undefined&&args.length>0) {
            args.pop();
        }
        if (args.length===1) {
            if (v&&typeof v==='string'&&v.length>=6&&v.length<=7) {
                if (v.length===7) {
                    v = v.substr(1,6);
                }
                let c=Colors.hex2rgb(v);
                this._r=c[0];
                this._g=c[1];
                this._b=c[2];
                this.calHSL();
            }  else if (v&&v.r!==undefined&&v.g!==undefined&&v.b!==undefined) {
                this._r=v.r;
                this._g=v.g;
                this._b=v.b;
                this.calHSL();
            } else if (v&&v.h!==undefined&&v.s!==undefined&&v.l!==undefined) {
                this._h=v.h;
                this._s=v.s;
                this._l=v.l;
                this.calRGB();
            } else if (v&&v.length===3
                &&v[0]>=0&&v[1]>=0&&v[2]>=0
                &&v[0]<=255&&v[1]<=255&&v[2]<=255) {
                this._r=v[0];
                this._g=v[1];
                this._b=v[2];
                this.calHSL();
            } else if (v&&v.length===3
                &&v[0]>=0&&v[1]>=0&&v[2]>=0
                &&v[0]<=360&&v[1]<=100&&v[2]<=100) {
                this._h=v[0];
                this._s=v[1];
                this._l=v[2];
                this.calRGB();
            } else {
                return true;
            }
        } else if (args.length===3) {
            if (args[0]<=255&&args[1]<=255&&args[2]<=255
                &&args[0]>=0&&args[1]>=0&&args[2]>=0) {
                this._r=args[0];
                this._g=args[1];
                this._b=args[2];
                this.calHSL();
            } else if (args[0]<=360&&args[1]<=100&&args[2]<=100
                &&args[0]>=0&&args[1]>=0&&args[2]>=0) {
                this._h=c[0];
                this._s=c[1];
                this._l=c[2];
                this.calRGB();
            } else {
                return true;
            }
        } else {
            return true;
        }
    }

    getRGB() {
        return [this._r, this._g, this._b];
    }

    getHSL() {
        let c=Colors.rgb2hsl(this._r, this._g, this._b);
        return [c.h, c.s, c.l];
    }

    set r(v){this._r=v;this.calHSL();}

    get r(){return this._r;}

    set g(v){this._g = v;this.calHSL();}

    get g(){return this._g}

    set b(v){this._b = v;this.calHSL();}

    get b(){return this._b}

    set h(v){this._h = v;this.calRGB();}

    get h(){return this._h}

    set s(v){this._s = v;this.calRGB();}

    get s(){return this._s}

    set l(v){this._l = v;this.calRGB();}

    get l(){return this._l}

    set hex(v){
        let c=Colors.hex2rgb(v);
        this._r=c[0];
        this._g=c[1];
        this._b=c[2];
        this.calHSL();
    }

    get hex(){return Colors.rgb2hex(this._r, this._g, this._b);}
}

export namespace Colors {
    export function rgb2hex(_r, _g, _b) {
        let r=_r,
            g=_g,
            b=_b;
        return (
            (r<16 ? '0':'')+r.toString(16)+
            (g<16 ? '0':'')+g.toString(16)+
            (b<16 ? '0':'')+b.toString(16)
        ).toUpperCase();
    };

    export function hex2rgb(HEX) {
        HEX=HEX.split(''); // IE7
        return [
            parseInt('0x'+HEX[0]+HEX[HEX[3] ? 1:0]),
            parseInt('0x'+HEX[HEX[3] ? 2:1]+(HEX[3]||HEX[1])),
            parseInt('0x'+(HEX[4]||HEX[2])+(HEX[5]||HEX[2]))
        ];
    };


    export function hsl2rgb(h, s, l) {

        h=h/360.0*6.0;
        s/=100.0;
        l/=100.0;
        let v=l<0.5 ? l*(1+s):(l+s)-(s*l);
        let m=l+l-v;
        let sv=v ? ((v-m)/v):0;
        let sextant=~~h; // math.floor(h) -> faster in most browsers
        let fract=h-sextant;
        let vsf=v*sv*fract;
        let t=m+vsf;
        let q=v-vsf,
            mod=sextant%6;

        return [
            math.floor([v, q, m, m, t, v][mod]*255),
            math.floor([t, v, v, q, m, m][mod]*255),
            math.floor([m, m, t, v, v, q][mod]*255)
        ];
    };

    export function rgb2hsl(r, g, b) {
        r/=255, g/=255, b/=255;
        let max=math.max(r, g, b), min=math.min(r, g, b);
        let h, s, l=(max+min)/2;

        if (max==min) {
            h=s=0; // achromatic
        } else {
            let d=max-min;
            s=l>0.5 ? d/(2-max-min):d/(max+min);
            switch (max) {
                case r:
                    h=(g-b)/d+(g<b ? 6:0);
                    break;
                case g:
                    h=(b-r)/d+2;
                    break;
                case b:
                    h=(r-g)/d+4;
                    break;
            }
            h/=6;
        }
        return [h*360, s*100, l*100];
    }

    export function getLuminance(rgb, normalized) {
        let div=normalized ? 1:255;
        let RGB=[rgb.r/div, rgb.g/div, rgb.b/div];

        for (let i=RGB.length; i--;) {
            RGB[i]=RGB[i]<=0.03928 ? RGB[i]/12.92:math.pow(((RGB[i]+0.055)/1.055), 2.4);
        }
        return ((LuminanceC.r*RGB[0])+(LuminanceC.g*RGB[1])+(LuminanceC.b*RGB[2]));
    };

    export function mixColors(topColor, bottomColor, topAlpha, bottomAlpha) {
        let newColor={},
            alphaTop=(topAlpha!==undefined ? topAlpha:1),
            alphaBottom=(bottomAlpha!==undefined ? bottomAlpha:1),
            alpha=alphaTop+alphaBottom*(1-alphaTop); // 1 - (1 - alphaTop) * (1 - alphaBottom);

        for (let n in topColor) {
            newColor[n]=(topColor[n]*alphaTop+bottomColor[n]*alphaBottom*(1-alphaTop))/alpha;
        }
        newColor.a=alpha;
        return newColor;
    }

    export function lerpColor(t,colorA,colorB,a1,b1) {
        let args = [].slice.call(arguments);
        if (args.length===5) {
            t = (t-colorA)/(colorB-colorA);
            colorA = a1;
            colorB = b1;
        }
        let r = math.lerp(t,colorA.r,colorB.r);
        let g = math.lerp(t,colorA.g,colorB.g);
        let b = math.lerp(t,colorA.b,colorB.b);
        return new Color([r,g,b]);
    };

    export function lerpColorHSL(t,colorA,colorB,a1,b1) {
        let args = [].slice.call(arguments);
        if (args.length===5) {
            t = (t-colorA)/(colorB-colorA);
            colorA = a1;
            colorB = b1;
        }
        let ret = new Color();
        ret.h = math.lerp(t,colorA.h,colorB.h);
        ret.s = math.lerp(t,colorA.s,colorB.s);
        ret.l = math.lerp(t,colorA.l,colorB.l);
        return ret;
    };

    export function reverseLerp(t,a,b,max) {
        return (a-(max-b+a)*t+max)%max;
    }

    export function lerpColorHSLReverse(t,colorA,colorB,a1,b1) {
        let args = [].slice.call(arguments);
        if (args.length===5) {
            t = (t-colorA)/(colorB-colorA);
            colorA = a1;
            colorB = b1;
        }
        let ret = new Color();
        ret.h = reverseLerp(t,colorA.h,colorB.h,360);
        ret.s = math.lerp(t,colorA.s,colorB.s);
        ret.l = math.lerp(t,colorA.l,colorB.l);
        return ret;
    };

    export function lerpCCColor(t,colorA,colorB) {
        let r = math.lerp(t,colorA.r,colorB.r);
        let g = math.lerp(t,colorA.g,colorB.g);
        let b = math.lerp(t,colorA.b,colorB.b);
        let a = math.lerp(t,colorA.a,colorB.a);
        return cc.color(r,g,b,a);
    };

    export function getCCColor(r,g,b,a) {
        return (new Color(r,g,b,a)).toCCColorfunction();
    };
}