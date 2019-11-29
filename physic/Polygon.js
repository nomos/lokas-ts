const Component = require('../Component');

class Polygon extends Component{
    static defineName(){
        return 'Polygon';
    }
    constructor(x = 0, y = 0, points = [], angle = 0, scale_x = 1, scale_y = 1, padding = 0){
        super();
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.scale_x = scale_x;
        this.scale_y = scale_y;
        this._x = x;
        this._y = y;
        this._angle = angle;
        this._scale_x = scale_x;
        this._scale_y = scale_y;
        this.minX = 0;
        this.minY = 0;
        this.maxX = 0;
        this.maxY = 0;
        this._points = null;
        this._coords = null;
        this._edges = null;
        this._normals = null;
        this._dirty_coords = true;
        this._dirty_normals = true;
        Polygon.prototype.setPoints.call(this, points);
    }
    setPoints(new_points) {
        const count = new_points.length;

        this._points  = new Float64Array(count * 2);
        this._coords  = new Float64Array(count * 2);
        this._edges   = new Float64Array(count * 2);
        this._normals = new Float64Array(count * 2);

        const points = this._points;

        for(let i = 0, ix = 0, iy = 1; i < count; ++i, ix += 2, iy += 2) {
            const new_point = new_points[i];

            points[ix] = new_point[0];
            points[iy] = new_point[1];
        }

        this._dirty_coords = true;
    }
    _calculateCoords() {
        const x       = this.x;
        const y       = this.y;
        const angle   = this.angle;
        const scale_x = this.scale_x;
        const scale_y = this.scale_y;
        const points  = this._points;
        const coords  = this._coords;
        const count   = points.length;

        let min_x;
        let max_x;
        let min_y;
        let max_y;

        for(let ix = 0, iy = 1; ix < count; ix += 2, iy += 2) {
            let coord_x = points[ix] * scale_x;
            let coord_y = points[iy] * scale_y;

            if(angle) {
                const cos   = Math.cos(angle);
                const sin   = Math.sin(angle);
                const tmp_x = coord_x;
                const tmp_y = coord_y;

                coord_x = tmp_x * cos - tmp_y * sin;
                coord_y = tmp_x * sin + tmp_y * cos;
            }

            coord_x += x;
            coord_y += y;

            coords[ix] = coord_x;
            coords[iy] = coord_y;

            if(ix === 0) {
                min_x = max_x = coord_x;
                min_y = max_y = coord_y;
            } else {
                if(coord_x < min_x) {
                    min_x = coord_x;
                }
                else if(coord_x > max_x) {
                    max_x = coord_x;
                }

                if(coord_y < min_y) {
                    min_y = coord_y;
                }
                else if(coord_y > max_y) {
                    max_y = coord_y;
                }
            }
        }

        this._x             = x;
        this._y             = y;
        this._angle         = angle;
        this._scale_x       = scale_x;
        this._scale_y       = scale_y;
        this.minX         = min_x;
        this.minY         = min_y;
        this.maxX         = max_x;
        this.maxY         = max_y;
        this._dirty_coords  = false;
        this._dirty_normals = true;
    }
    draw(context) {
        if(this.getEntity().isDirty()) {
            this._calculateCoords();
        }

        const coords = this._coords;
        if(coords.length === 2) {
            context.moveTo(coords[0], coords[1]);
            context.arc(coords[0], coords[1], 1, 0, Math.PI * 2);
        }
        else {
            context.moveTo(coords[0], coords[1]);

            for(let i = 2; i < coords.length; i += 2) {
                context.lineTo(coords[i], coords[i + 1]);
            }

            if(coords.length > 4) {
                context.lineTo(coords[0], coords[1]);
            }
        }
    }
    _calculateNormals() {
        const coords  = this._coords;
        const edges   = this._edges;
        const normals = this._normals;
        const count   = coords.length;

        for(let ix = 0, iy = 1; ix < count; ix += 2, iy += 2) {
            const next   = ix + 2 < count ? ix + 2 : 0;
            const x      = coords[next] - coords[ix];
            const y      = coords[next + 1] - coords[iy];
            const length = x || y ? Math.sqrt(x * x + y * y) : 0;

            edges[ix]   = x;
            edges[iy]   = y;
            normals[ix] = length ? y / length : 0;
            normals[iy] = length ? -x / length : 0;
        }

        this._dirty_normals = false;
    }

}

module.exports = Polygon;