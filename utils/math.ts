
class MathX implements Math{
    clz32(x: number): number {
        throw new Error("Method not implemented.")
    }
    imul(x: number, y: number): number {
        throw new Error("Method not implemented.")
    }
    log10(x: number): number {
        throw new Error("Method not implemented.")
    }
    log2(x: number): number {
        throw new Error("Method not implemented.")
    }
    log1p(x: number): number {
        throw new Error("Method not implemented.")
    }
    expm1(x: number): number {
        throw new Error("Method not implemented.")
    }
    cosh(x: number): number {
        throw new Error("Method not implemented.")
    }
    sinh(x: number): number {
        throw new Error("Method not implemented.")
    }
    tanh(x: number): number {
        throw new Error("Method not implemented.")
    }
    acosh(x: number): number {
        throw new Error("Method not implemented.")
    }
    asinh(x: number): number {
        throw new Error("Method not implemented.")
    }
    atanh(x: number): number {
        throw new Error("Method not implemented.")
    }
    hypot(...values: number[]): number {
        throw new Error("Method not implemented.")
    }
    trunc(x: number): number {
        throw new Error("Method not implemented.")
    }
    fround(x: number): number {
        throw new Error("Method not implemented.")
    }
    cbrt(x: number): number {
        throw new Error("Method not implemented.")
    }
    [Symbol.toStringTag]: string
    readonly E: number = Math.E
    /** The natural logarithm of 10. */
    readonly LN10: number = Math.LN10
    /** The natural logarithm of 2. */
    readonly LN2: number = Math.LN2
    /** The base-2 logarithm of e. */
    readonly LOG2E: number = Math.LOG2E
    /** The base-10 logarithm of e. */
    readonly LOG10E: number = Math.LOG10E
    /** Pi. This is the ratio of the circumference of a circle to its diameter. */
    readonly PI: number = Math.PI
    /** The square root of 0.5, or, equivalently, one divided by the square root of 2. */
    readonly SQRT1_2: number = Math.SQRT1_2
    /** The square root of 2. */
    readonly SQRT2: number = Math.SQRT2
    /**
     * Returns the absolute value of a number (the value without regard to whether it is positive or negative).
     * For example, the absolute value of -5 is the same as the absolute value of 5.
     * @param x A numeric expression for which the absolute value is needed.
     */
    abs:(x: number)=> number = Math.abs
    /**
     * Returns the arc cosine (or inverse cosine) of a number.
     * @param x A numeric expression.
     */
    acos:(x: number)=> number = Math.acos
    /**
     * Returns the arcsine of a number.
     * @param x A numeric expression.
     */
    asin:(x: number)=> number = Math.asin
    /**
     * Returns the arctangent of a number.
     * @param x A numeric expression for which the arctangent is needed.
     */
    atan:(x: number)=> number = Math.atan
    /**
     * Returns the angle (in radians) from the X axis to a point.
     * @param y A numeric expression representing the cartesian y-coordinate.
     * @param x A numeric expression representing the cartesian x-coordinate.
     */
    atan2:(y: number, x: number)=> number = Math.atan2
    /**
     * Returns the smallest integer greater than or equal to its numeric argument.
     * @param x A numeric expression.
     */
    ceil:(x: number)=> number = Math.ceil
    /**
     * Returns the cosine of a number.
     * @param x A numeric expression that contains an angle measured in radians.
     */
    cos:(x: number)=> number = Math.cos
    /**
     * Returns e (the base of natural logarithms) raised to a power.
     * @param x A numeric expression representing the power of e.
     */
    exp:(x: number)=> number = Math.exp
    /**
     * Returns the greatest integer less than or equal to its numeric argument.
     * @param x A numeric expression.
     */
    floor:(x: number)=> number = Math.floor
    /**
     * Returns the natural logarithm (base e) of a number.
     * @param x A numeric expression.
     */
    log:(x: number)=> number = Math.log
    /**
     * Returns the larger of a set of supplied numeric expressions.
     * @param values Numeric expressions to be evaluated.
     */
    max:(...values: number[])=> number = Math.max
    /**
     * Returns the smaller of a set of supplied numeric expressions.
     * @param values Numeric expressions to be evaluated.
     */
    min:(...values: number[])=> number = Math.min
    /**
     * Returns the value of a base expression taken to a specified power.
     * @param x The base value of the expression.
     * @param y The exponent value of the expression.
     */
    pow:(x: number, y: number)=> number = Math.pow
    /** Returns a pseudorandom number between 0 and 1. */
    random:()=> number = Math.random
    /**
     * Returns a supplied numeric expression rounded to the nearest integer.
     * @param x The value to be rounded to the nearest integer.
     */
    round:(x: number)=> number = Math.round
    /**
     * Returns the sine of a number.
     * @param x A numeric expression that contains an angle measured in radians.
     */
    sin:(x: number)=> number = Math.sin
    /**
     * Returns the square root of a number.
     * @param x A numeric expression.
     */
    sqrt:(x: number)=> number = Math.sqrt
    /**
     * Returns the tangent of a number.
     * @param x A numeric expression that contains an angle measured in radians.
     */
    tan:(x: number)=> number = Math.tan

    fract(v:number):number {
        return v-Math.floor(v);
    }

    sign(v:number):number {
        return v>0?1.0:v<0?-1.0:0;
    }
    mod(a:number,b:number):number {
        return a-Math.floor(a/b);
    }
    clamp(v:number,min:number,max:number):number {
        return Math.min(Math.max(v,min),max);
    }
    step(edge:number,x:number):number {
        return x<edge?0:1;
    }
    range(start:number, end:number):number[] {
        let n0 = typeof start === 'number',
            n1 = typeof end === 'number';

        if (n0 && !n1) {
            end = start;
            start = 0;
        } else if (!n0 && !n1) {
            start = 0;
            end = 0;
        }

        start = start|0;
        end = end|0;
        let len = end-start;
        if (len<0)
            throw new Error('array length must be positive');

        let a = new Array(len);
        for (let i=0, c=start; i<len; i++, c++)
            a[i] = c
        return a
    }

    lerp(t:number, a:number, b:number):number {
        return a+t*(b-a);
    }

}

export const math = new MathX()