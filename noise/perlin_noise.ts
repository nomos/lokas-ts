import {dice} from "../utils/dice";
import {math} from "../utils/math";

function grad1(hash, x) {
    let h=hash&15;
    let grad=1.0+(h&7);
    if (h&8)
        grad= -grad;
    return grad*x;
}

function grad2(hash, x, y) {
    let h=hash&7;
    let u=h<4 ? x:y;
    let v=h<4 ? y:x;
    return ((h&1) ? -u:u)+((h&2) ? -2.0*v:2.0*v);
}

function grad3(hash, x, y, z) {
    let h=hash&15;
    let u=h<8 ? x:y;
    let v=h<4 ? y:h===12||h===14 ? x:z;
    return ((h&1) ? -u:u)+((h&2) ? -v:v);
}

function grad4(hash, x, y, z, t) {
    let h=hash&31;
    let u=h<24 ? x:y;
    let v=h<16 ? y:z;
    let w=h<8 ? z:t;
    return ((h&1) ? -u:u)+((h&2) ? -v:v)+((h&4) ? -w:w);
}

function fade(t) {
    return t*t*t*(t*(t*6-15)+10);
}

function lerp(t, a, b) {
    return a+t*(b-a);
}

export class PerlinNoise {
    constructor(seed) {
        this.perm=math.range(0,256);
        dice.shuffle(this.perm, seed);
        this.perm=this.perm.concat(this.perm);
    }
    noise1(x) {
        let ix0, ix1, fx0, fx1, s, n0, n1;
        ix0=math.floor(x);
        fx0=x-ix0;
        fx1=fx0-1.0;
        ix1=(ix0+1)&0xff;
        ix0=ix0&0xff;
        s=fade(fx0);
        n0=grad1(this.perm[ix0], fx0);
        n1=grad1(this.perm[ix1], fx1);
        return 0.188*(lerp(s, n0, n1));
    }

    pnoise1(x, px) {
        let ix0, ix1, fx0, fx1, s, n0, n1;
        ix0=math.floor(x);
        fx0=x-ix0;
        fx1=fx0-1.0;
        ix1=((ix0+1)%px)&0xff;
        ix0=(ix0%px)&0xff;
        s=fade(fx0);
        n0=grad1(this.perm[ix0], fx0);
        n1=grad1(this.perm[ix1], fx1);
        //log.debug('s',s,'n0',n0,'n1',n1);
        return 0.188*(lerp(s, n0, n1));
    }

    noise2(x, y) {
        let ix0, iy0, ix1, iy1, fx0, fy0, fx1, fy1, s, t, nx0, nx1, n0, n1;
        ix0=math.floor(x); // Integer part of x
        iy0=math.floor(y); // Integer part of y
        fx0=x-ix0;        // Fractional part of x
        fy0=y-iy0;        // Fractional part of y
        fx1=fx0-1.0;
        fy1=fy0-1.0;
        ix1=(ix0+1)&0xff;  // Wrap to 0..255
        iy1=(iy0+1)&0xff;
        ix0=ix0&0xff;
        iy0=iy0&0xff;
        t=fade(fy0);
        s=fade(fx0);
        nx0=grad2(this.perm[ix0+this.perm[iy0]], fx0, fy0);
        nx1=grad2(this.perm[ix0+this.perm[iy1]], fx0, fy1);
        n0=lerp(t, nx0, nx1);

        nx0=grad2(this.perm[ix1+this.perm[iy0]], fx1, fy0);
        nx1=grad2(this.perm[ix1+this.perm[iy1]], fx1, fy1);
        n1=lerp(t, nx0, nx1);
        return 0.507*(lerp(s, n0, n1));
    }

    pnoise2(x, y, px, py) {
        let ix0, iy0, ix1, iy1, fx0, fy0, fx1, fy1, s, t, nx0, nx1, n0, n1;
        ix0=math.floor(x); // Integer part of x
        iy0=math.floor(y); // Integer part of y
        fx0=x-ix0;        // Fractional part of x
        fy0=y-iy0;        // Fractional part of y
        fx1=fx0-1.0;
        fy1=fy0-1.0;
        ix1=((ix0+1)%px)&0xff;  // Wrap to 0..px-1 and wrap to 0..255
        iy1=((iy0+1)%py)&0xff;  // Wrap to 0..py-1 and wrap to 0..255
        ix0=(ix0%px)&0xff;
        iy0=(iy0%py)&0xff;
        t=fade(fy0);
        s=fade(fx0);
        nx0=grad2(this.perm[ix0+this.perm[iy0]], fx0, fy0);
        nx1=grad2(this.perm[ix0+this.perm[iy1]], fx0, fy1);
        n0=lerp(t, nx0, nx1);

        nx0=grad2(this.perm[ix1+this.perm[iy0]], fx1, fy0);
        nx1=grad2(this.perm[ix1+this.perm[iy1]], fx1, fy1);
        n1=lerp(t, nx0, nx1);
        return 0.507*(lerp(s, n0, n1));
    }

    noise3(x, y, z) {
        let ix0, iy0, ix1, iy1, iz0, iz1, fx0, fy0, fz0, fx1, fy1, fz1, s, t, r, nxy0, nxy1, nx0, nx1, n0, n1;

        ix0=math.floor(x); // Integer part of x
        iy0=math.floor(y); // Integer part of y
        iz0=math.floor(z); // Integer part of z
        fx0=x-ix0;        // Fractional part of x
        fy0=y-iy0;        // Fractional part of y
        fz0=z-iz0;        // Fractional part of z
        fx1=fx0-1.0;
        fy1=fy0-1.0;
        fz1=fz0-1.0;
        ix1=(ix0+1)&0xff; // Wrap to 0..255
        iy1=(iy0+1)&0xff;
        iz1=(iz0+1)&0xff;
        ix0=ix0&0xff;
        iy0=iy0&0xff;
        iz0=iz0&0xff;

        r=fade(fz0);
        t=fade(fy0);
        s=fade(fx0);

        nxy0=grad3(this.perm[ix0+this.perm[iy0+this.perm[iz0]]], fx0, fy0, fz0);
        nxy1=grad3(this.perm[ix0+this.perm[iy0+this.perm[iz1]]], fx0, fy0, fz1);
        nx0=lerp(r, nxy0, nxy1);

        nxy0=grad3(this.perm[ix0+this.perm[iy1+this.perm[iz0]]], fx0, fy1, fz0);
        nxy1=grad3(this.perm[ix0+this.perm[iy1+this.perm[iz1]]], fx0, fy1, fz1);
        nx1=lerp(r, nxy0, nxy1);

        n0=lerp(t, nx0, nx1);

        nxy0=grad3(this.perm[ix1+this.perm[iy0+this.perm[iz0]]], fx1, fy0, fz0);
        nxy1=grad3(this.perm[ix1+this.perm[iy0+this.perm[iz1]]], fx1, fy0, fz1);
        nx0=lerp(r, nxy0, nxy1);

        nxy0=grad3(this.perm[ix1+this.perm[iy1+this.perm[iz0]]], fx1, fy1, fz0);
        nxy1=grad3(this.perm[ix1+this.perm[iy1+this.perm[iz1]]], fx1, fy1, fz1);
        nx1=lerp(r, nxy0, nxy1);

        n1=lerp(t, nx0, nx1);

        return 0.936*(lerp(s, n0, n1));
    }

    pnoise3(x, y, z, px, py, pz) {
        let ix0, iy0, ix1, iy1, iz0, iz1, fx0, fy0, fz0, fx1, fy1, fz1, s, t, r, nxy0, nxy1, nx0, nx1, n0, n1;

        ix0=math.floor(x); // Integer part of x
        iy0=math.floor(y); // Integer part of y
        iz0=math.floor(z); // Integer part of z
        fx0=x-ix0;        // Fractional part of x
        fy0=y-iy0;        // Fractional part of y
        fz0=z-iz0;        // Fractional part of z
        fx1=fx0-1.0;
        fy1=fy0-1.0;
        fz1=fz0-1.0;
        ix1=((ix0+1)%px)&0xff; // Wrap to 0..px-1 and wrap to 0..255
        iy1=((iy0+1)%py)&0xff; // Wrap to 0..py-1 and wrap to 0..255
        iz1=((iz0+1)%pz)&0xff; // Wrap to 0..pz-1 and wrap to 0..255
        ix0=(ix0%px)&0xff;
        iy0=(iy0%py)&0xff;
        iz0=(iz0%pz)&0xff;

        r=fade(fz0);
        t=fade(fy0);
        s=fade(fx0);

        nxy0=grad3(this.perm[ix0+this.perm[iy0+this.perm[iz0]]], fx0, fy0, fz0);
        nxy1=grad3(this.perm[ix0+this.perm[iy0+this.perm[iz1]]], fx0, fy0, fz1);
        nx0=lerp(r, nxy0, nxy1);

        nxy0=grad3(this.perm[ix0+this.perm[iy1+this.perm[iz0]]], fx0, fy1, fz0);
        nxy1=grad3(this.perm[ix0+this.perm[iy1+this.perm[iz1]]], fx0, fy1, fz1);
        nx1=lerp(r, nxy0, nxy1);

        n0=lerp(t, nx0, nx1);

        nxy0=grad3(this.perm[ix1+this.perm[iy0+this.perm[iz0]]], fx1, fy0, fz0);
        nxy1=grad3(this.perm[ix1+this.perm[iy0+this.perm[iz1]]], fx1, fy0, fz1);
        nx0=lerp(r, nxy0, nxy1);

        nxy0=grad3(this.perm[ix1+this.perm[iy1+this.perm[iz0]]], fx1, fy1, fz0);
        nxy1=grad3(this.perm[ix1+this.perm[iy1+this.perm[iz1]]], fx1, fy1, fz1);
        nx1=lerp(r, nxy0, nxy1);

        n1=lerp(t, nx0, nx1);

        return 0.936*(lerp(s, n0, n1));
    }

    noise4(x, y, z, w) {
        let ix0, iy0, iz0, iw0, ix1, iy1, iz1, iw1, fx0, fy0, fz0, fw0, fx1, fy1, fz1, fw1, s, t, r, q, nxyz0, nxyz1,
            nxy0, nxy1, nx0, nx1, n0, n1;

        ix0=math.floor(x); // Integer part of x
        iy0=math.floor(y); // Integer part of y
        iz0=math.floor(z); // Integer part of y
        iw0=math.floor(w); // Integer part of w
        fx0=x-ix0;        // Fractional part of x
        fy0=y-iy0;        // Fractional part of y
        fz0=z-iz0;        // Fractional part of z
        fw0=w-iw0;        // Fractional part of w
        fx1=fx0-1.0;
        fy1=fy0-1.0;
        fz1=fz0-1.0;
        fw1=fw0-1.0;
        ix1=(ix0+1)&0xff;  // Wrap to 0..255
        iy1=(iy0+1)&0xff;
        iz1=(iz0+1)&0xff;
        iw1=(iw0+1)&0xff;
        ix0=ix0&0xff;
        iy0=iy0&0xff;
        iz0=iz0&0xff;
        iw0=iw0&0xff;

        q=fade(fw0);
        r=fade(fz0);
        t=fade(fy0);
        s=fade(fx0);

        nxyz0=grad4(this.perm[ix0+this.perm[iy0+this.perm[iz0+this.perm[iw0]]]], fx0, fy0, fz0, fw0);
        nxyz1=grad4(this.perm[ix0+this.perm[iy0+this.perm[iz0+this.perm[iw1]]]], fx0, fy0, fz0, fw1);
        nxy0=lerp(q, nxyz0, nxyz1);

        nxyz0=grad4(this.perm[ix0+this.perm[iy0+this.perm[iz1+this.perm[iw0]]]], fx0, fy0, fz1, fw0);
        nxyz1=grad4(this.perm[ix0+this.perm[iy0+this.perm[iz1+this.perm[iw1]]]], fx0, fy0, fz1, fw1);
        nxy1=lerp(q, nxyz0, nxyz1);

        nx0=lerp(r, nxy0, nxy1);

        nxyz0=grad4(this.perm[ix0+this.perm[iy1+this.perm[iz0+this.perm[iw0]]]], fx0, fy1, fz0, fw0);
        nxyz1=grad4(this.perm[ix0+this.perm[iy1+this.perm[iz0+this.perm[iw1]]]], fx0, fy1, fz0, fw1);
        nxy0=lerp(q, nxyz0, nxyz1);

        nxyz0=grad4(this.perm[ix0+this.perm[iy1+this.perm[iz1+this.perm[iw0]]]], fx0, fy1, fz1, fw0);
        nxyz1=grad4(this.perm[ix0+this.perm[iy1+this.perm[iz1+this.perm[iw1]]]], fx0, fy1, fz1, fw1);
        nxy1=lerp(q, nxyz0, nxyz1);

        nx1=lerp(r, nxy0, nxy1);

        n0=lerp(t, nx0, nx1);

        nxyz0=grad4(this.perm[ix1+this.perm[iy0+this.perm[iz0+this.perm[iw0]]]], fx1, fy0, fz0, fw0);
        nxyz1=grad4(this.perm[ix1+this.perm[iy0+this.perm[iz0+this.perm[iw1]]]], fx1, fy0, fz0, fw1);
        nxy0=lerp(q, nxyz0, nxyz1);

        nxyz0=grad4(this.perm[ix1+this.perm[iy0+this.perm[iz1+this.perm[iw0]]]], fx1, fy0, fz1, fw0);
        nxyz1=grad4(this.perm[ix1+this.perm[iy0+this.perm[iz1+this.perm[iw1]]]], fx1, fy0, fz1, fw1);
        nxy1=lerp(q, nxyz0, nxyz1);

        nx0=lerp(r, nxy0, nxy1);

        nxyz0=grad4(this.perm[ix1+this.perm[iy1+this.perm[iz0+this.perm[iw0]]]], fx1, fy1, fz0, fw0);
        nxyz1=grad4(this.perm[ix1+this.perm[iy1+this.perm[iz0+this.perm[iw1]]]], fx1, fy1, fz0, fw1);
        nxy0=lerp(q, nxyz0, nxyz1);

        nxyz0=grad4(this.perm[ix1+this.perm[iy1+this.perm[iz1+this.perm[iw0]]]], fx1, fy1, fz1, fw0);
        nxyz1=grad4(this.perm[ix1+this.perm[iy1+this.perm[iz1+this.perm[iw1]]]], fx1, fy1, fz1, fw1);
        nxy1=lerp(q, nxyz0, nxyz1);

        nx1=lerp(r, nxy0, nxy1);

        n1=lerp(t, nx0, nx1);

        return 0.87*(lerp(s, n0, n1));
    }

    pnoise4(x, y, z, w, px, py, pz, pw) {
        let ix0, iy0, iz0, iw0, ix1, iy1, iz1, iw1, fx0, fy0, fz0, fw0, fx1, fy1, fz1, fw1, s, t, r, q, nxyz0, nxyz1,
            nxy0, nxy1, nx0, nx1, n0, n1;

        ix0=math.floor(x); // Integer part of x
        iy0=math.floor(y); // Integer part of y
        iz0=math.floor(z); // Integer part of y
        iw0=math.floor(w); // Integer part of w
        fx0=x-ix0;        // Fractional part of x
        fy0=y-iy0;        // Fractional part of y
        fz0=z-iz0;        // Fractional part of z
        fw0=w-iw0;        // Fractional part of w
        fx1=fx0-1.0;
        fy1=fy0-1.0;
        fz1=fz0-1.0;
        fw1=fw0-1.0;
        ix1=((ix0+1)%px)&0xff;  // Wrap to 0..px-1 and wrap to 0..255
        iy1=((iy0+1)%py)&0xff;  // Wrap to 0..py-1 and wrap to 0..255
        iz1=((iz0+1)%pz)&0xff;  // Wrap to 0..pz-1 and wrap to 0..255
        iw1=((iw0+1)%pw)&0xff;  // Wrap to 0..pw-1 and wrap to 0..255
        ix0=(ix0%px)&0xff;
        iy0=(iy0%py)&0xff;
        iz0=(iz0%pz)&0xff;
        iw0=(iw0%pw)&0xff;

        q=fade(fw0);
        r=fade(fz0);
        t=fade(fy0);
        s=fade(fx0);

        nxyz0=grad4(this.perm[ix0+this.perm[iy0+this.perm[iz0+this.perm[iw0]]]], fx0, fy0, fz0, fw0);
        nxyz1=grad4(this.perm[ix0+this.perm[iy0+this.perm[iz0+this.perm[iw1]]]], fx0, fy0, fz0, fw1);
        nxy0=lerp(q, nxyz0, nxyz1);

        nxyz0=grad4(this.perm[ix0+this.perm[iy0+this.perm[iz1+this.perm[iw0]]]], fx0, fy0, fz1, fw0);
        nxyz1=grad4(this.perm[ix0+this.perm[iy0+this.perm[iz1+this.perm[iw1]]]], fx0, fy0, fz1, fw1);
        nxy1=lerp(q, nxyz0, nxyz1);

        nx0=lerp(r, nxy0, nxy1);

        nxyz0=grad4(this.perm[ix0+this.perm[iy1+this.perm[iz0+this.perm[iw0]]]], fx0, fy1, fz0, fw0);
        nxyz1=grad4(this.perm[ix0+this.perm[iy1+this.perm[iz0+this.perm[iw1]]]], fx0, fy1, fz0, fw1);
        nxy0=lerp(q, nxyz0, nxyz1);

        nxyz0=grad4(this.perm[ix0+this.perm[iy1+this.perm[iz1+this.perm[iw0]]]], fx0, fy1, fz1, fw0);
        nxyz1=grad4(this.perm[ix0+this.perm[iy1+this.perm[iz1+this.perm[iw1]]]], fx0, fy1, fz1, fw1);
        nxy1=lerp(q, nxyz0, nxyz1);

        nx1=lerp(r, nxy0, nxy1);

        n0=lerp(t, nx0, nx1);

        nxyz0=grad4(this.perm[ix1+this.perm[iy0+this.perm[iz0+this.perm[iw0]]]], fx1, fy0, fz0, fw0);
        nxyz1=grad4(this.perm[ix1+this.perm[iy0+this.perm[iz0+this.perm[iw1]]]], fx1, fy0, fz0, fw1);
        nxy0=lerp(q, nxyz0, nxyz1);

        nxyz0=grad4(this.perm[ix1+this.perm[iy0+this.perm[iz1+this.perm[iw0]]]], fx1, fy0, fz1, fw0);
        nxyz1=grad4(this.perm[ix1+this.perm[iy0+this.perm[iz1+this.perm[iw1]]]], fx1, fy0, fz1, fw1);
        nxy1=lerp(q, nxyz0, nxyz1);

        nx0=lerp(r, nxy0, nxy1);

        nxyz0=grad4(this.perm[ix1+this.perm[iy1+this.perm[iz0+this.perm[iw0]]]], fx1, fy1, fz0, fw0);
        nxyz1=grad4(this.perm[ix1+this.perm[iy1+this.perm[iz0+this.perm[iw1]]]], fx1, fy1, fz0, fw1);
        nxy0=lerp(q, nxyz0, nxyz1);

        nxyz0=grad4(this.perm[ix1+this.perm[iy1+this.perm[iz1+this.perm[iw0]]]], fx1, fy1, fz1, fw0);
        nxyz1=grad4(this.perm[ix1+this.perm[iy1+this.perm[iz1+this.perm[iw1]]]], fx1, fy1, fz1, fw1);
        nxy1=lerp(q, nxyz0, nxyz1);

        nx1=lerp(r, nxy0, nxy1);

        n1=lerp(t, nx0, nx1);

        return 0.87*(lerp(s, n0, n1));
    }

    fpnoise2(x, y, width, height, octave, frequency) {
        let ret=0;
        for (let i=0; i<octave; i++) {
            let o=math.pow(2, i);
            let p=this.pnoise2(x/height*frequency*o, y/height*frequency*o, width/height*o*frequency, o*frequency);
            p*=math.pow(0.5, i);
            ret+=p;
        }
        return ret;
    }

    fpnoise3(x, y, z, width, height, octave, frequency) {
        let ret=0;
        for (let i=0; i<octave; i++) {
            let o=math.pow(2, i);
            let p=this.pnoise3(x/height*frequency*o, y/height*frequency*o, z/height*frequency*o, width/height*o*frequency, o*frequency, o*frequency);
            p*=math.pow(0.5, i);
            ret+=p;
        }
        // console.log('ret',ret,'x',x,'y',y);
        return ret;
    }

    tpnoise3(x, y, z, width, height, octave, frequency) {
        let ret=0;
        for (let i=0; i<octave; i++) {
            let o=math.pow(2, i);
            let p=this.pnoise3(x/height*frequency*o, y/height*frequency*o, z/height*frequency*o, width/height*o*frequency, o*frequency, o*frequency);
            p*=math.pow(0.5, i);
            ret+=p;
        }
        // ret *= 2.0;
        // ret -= 1.0;
        // ret = math.cos(ret);

        return ret;
    }
}


