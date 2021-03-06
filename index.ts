const w : number = window.innerWidth 
const h : number = window.innerHeight 
const parts : number = 3
const scGap : number = 0.02 / parts 
const strokeFactor : number = 90  
const delay : number = 20 
const backColor : string = "#BDBDBD"
const colors : Array<string> = [
    "#F44336",
    "#3F51B5",
    "#4CAF50",
    "#03A9F4",
    "#FF9800"
]

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }

    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n 
    }

    static sinify(scale : number) : number {
        return Math.sin(scale * Math.PI)
    } 
}

class DrawingUtil {

    static drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }

    static drawCornerFillBox(context : CanvasRenderingContext2D, scale : number) {
        context.save()
        context.beginPath()
        context.moveTo(0, h)
        context.lineTo(w, 0)
        context.lineTo(w, h)
        context.lineTo(0, h)
        context.clip()
        context.fillRect(0, 0, w * scale, h)
        context.restore()
    }

    static drawTriFillCornerBox(context : CanvasRenderingContext2D, scale : number) {
        const sf : number = ScaleUtil.sinify(scale)
        const sf1 : number = ScaleUtil.divideScale(sf, 0, parts)
        DrawingUtil.drawLine(context, 0, h, w * sf1, h * (1 - sf1))
        for (var j = 0; j < 2; j++) {
            context.save()
            context.translate(w / 2, h / 2)
            context.scale(1 - 2 * j, 1 - 2 * j)
            context.save()
            context.translate(-w / 2, -h / 2)
            DrawingUtil.drawCornerFillBox(context, ScaleUtil.divideScale(sf, j + 1, parts))
            context.restore()
            context.restore()
        }
    }

    static drawTFCBNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        context.lineWidth = Math.min(w, h) / strokeFactor 
        context.lineCap = 'round'
        context.strokeStyle = colors[i]
        context.fillStyle = colors[i]
        DrawingUtil.drawTriFillCornerBox(context, scale)
    }
}

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D 
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w 
        this.canvas.height = h 
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor 
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {

    scale : number = 0 
    dir : number = 0 
    prevScale : number = 0 

    update(cb : Function) {
        this.scale += this.dir * scGap 
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir 
            this.dir = 0 
            this.prevScale = this.scale 
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale 
            cb()
        }
    }
}

class Animator {

    animated : boolean = false 
    interval : number 

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true 
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (!this.animated) {
            this.animated = false 
            clearInterval(this.interval)
        }
    }
}

class TFCBNode {
    next : TFCBNode 
    prev : TFCBNode 
    state : State 
    constructor(private i : number) {
        this.state = new State()
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < colors.length - 1) {
            this.next = new TFCBNode(this.i + 1)
            this.next.prev = this 
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawTFCBNode(context, this.i, this.state.scale)
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }
    
    getNext(dir : number, cb : Function) : TFCBNode {
        var curr : TFCBNode = this.prev 
        if (dir == 1) {
            curr = this.next 
        }
        if (curr) {
            return curr 
        }
        cb()
        return this 
    }
}

class TriFillCornerBox {

    curr : TFCBNode = new TFCBNode(0)
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {

    tfcb : TriFillCornerBox = new TriFillCornerBox()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.tfcb.draw(context)
    }

    handleTap(cb : Function) {
        this.tfcb.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.tfcb.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}