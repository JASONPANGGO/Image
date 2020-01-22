import React from 'react'
import { Spin, message, Icon } from 'antd'
import config from '../config'
var ctx = null
var currentAnnotation = { class: {}, box: [] }
var boxesTag = []

export default class Image extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            loaded: false,
            src: '',
            canvasReady: false,
            sampleClasses: '',
            currentClass: '',
        }
    }

    UNSAFE_componentWillMount() {
        this.setState({
            src: this.props.src,
            sampleClasses: this.props.sampleClasses
        })
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        const nowSrc = this.state.src
        if (nextProps.currentClass !== '无数据' && nextProps.currentClass) {
            this.setState({
                currentClass: nextProps.currentClass
            })
        }
        if (nowSrc !== nextProps.src) {
            const canvases = this.refs.imgContainer.getElementsByTagName('canvas')
            for (let i = 0; i < canvases.length; i++) {
                canvases[i].remove()
            }
            this.setState({
                canvasReady: false,
                loaded: false,
                src: nextProps.src
            })
        }
    }

    onLoaded() {
        this.setState({
            loaded: true
        }, () => {
            if (this.props.type === 2) this.createCanvas()
        })
    }

    drawAllBoxes(boxes, selectedBoxIndex) {
        const canvasWidth = this.refs.img.clientWidth
        const canvasHeight = this.refs.img.clientHeight
        currentAnnotation.box = boxes
        ctx.clearRect(0, 0, canvasWidth, canvasHeight)

        boxes.forEach((box, index) => {
            this.onDrawRect(box.class, config.TAG_COLOR[this.state.sampleClasses.indexOf(box.class)], box.left_x, box.left_y, box.right_x, box.right_y, index === selectedBoxIndex)
        })
    }

    // 每一个方框的绘制函数，接受参数为比例
    onDrawRect(className, color, x1, y1, x2, y2, selected = false) {
        const canvasWidth = this.refs.img.clientWidth
        const canvasHeight = this.refs.img.clientHeight
        ctx.lineWidth = '2'
        ctx.strokeStyle = color
        if (selected) {
            ctx.setLineDash([5, 5])
        } else {
            ctx.setLineDash([])
        }
        ctx.strokeRect(x1 * canvasWidth, y1 * canvasHeight, (x2 - x1) * canvasWidth, (y2 - y1) * canvasHeight)
        ctx.font = "12px serif";
        ctx.fillStyle = 'white'
        ctx.fillText(className, x1 * canvasWidth + 1, y1 * canvasHeight - 5)
        ctx.fillStyle = color
        ctx.fillRect(x1 * canvasWidth - 1, y1 * canvasHeight - 12 - 5, ctx.measureText(className).width + 5, 16)
        ctx.fillStyle = 'white'
        ctx.fillText(className, x1 * canvasWidth + 1, y1 * canvasHeight - 5)
    }


    createCanvas() {
        const globalThis = this
        let hoverBoxIndex = -1
        currentAnnotation = { class: {}, box: [] }
        boxesTag = []
        const canvasWidth = this.refs.img.clientWidth
        const canvasHeight = this.refs.img.clientHeight
        const canvas = document.createElement('canvas')
        canvas.setAttribute('id', this.props.canvasID)
        canvas.setAttribute('width', canvasWidth)
        canvas.setAttribute('height', canvasHeight)
        canvas.setAttribute('style', 'position:absolute;left:0;')
        ctx = canvas.getContext('2d')
        // const canvases = document.getElementsByTagName('canvas')
        // const canvases = document.getElementById(this.props.canvasID)
        // console.log(canvases)
        // for (let i = 0; i < canvases.length; i++) {
        //     canvases[i].remove()
        // }

        // 开始监听鼠标事件并画框
        function DrawStart() {

            // 鼠标画框的函数，参数为比例
            function drawRect(x1, y1, x2, y2) {
                ctx.clearRect(0, 0, canvasWidth, canvasHeight)
                const boxes = currentAnnotation.box
                globalThis.drawAllBoxes(boxes)
                globalThis.onDrawRect(globalThis.state.currentClass, config.TAG_COLOR[globalThis.state.sampleClasses.indexOf(globalThis.state.currentClass)], x1, y1, x2, y2)
            }
            let painting = false
            let startPoint = {}
            let endPoint = {}
            canvas.onmousedown = function (e) {
                if (globalThis.state.currentClass !== '无数据' && globalThis.state.currentClass) {
                    if (boxesTag.findIndex(boxTag => e.offsetX >= boxTag.x1 && e.offsetX <= boxTag.x2 && e.offsetY >= boxTag.y1 && e.offsetY <= boxTag.y2) === -1) {
                        painting = true
                        startPoint.x = e.offsetX
                        startPoint.y = e.offsetY
                    }
                }
            }
            canvas.onmousemove = function (e) {
                endPoint.x = e.offsetX
                endPoint.y = e.offsetY
                if (painting) {
                    drawRect(startPoint.x / canvasWidth, startPoint.y / canvasHeight, endPoint.x / canvasWidth, endPoint.y / canvasHeight)
                } else {
                    hoverBoxIndex = boxesTag.findIndex(boxTag => e.offsetX >= boxTag.x1 && e.offsetX <= boxTag.x2 && e.offsetY >= boxTag.y1 && e.offsetY <= boxTag.y2)
                    globalThis.drawAllBoxes(currentAnnotation.box, hoverBoxIndex)
                }
            }
            canvas.onmouseup = function (e) {
                const boxes = currentAnnotation.box
                if (painting) {
                    if (Math.abs((endPoint.x - startPoint.x) * (endPoint.y - startPoint.y)) < 4) {
                        message.warning('框选区域太小')
                    } else {
                        boxes.push({
                            class: globalThis.state.currentClass,
                            left_x: (startPoint.x / canvasWidth).toFixed(4),
                            left_y: (startPoint.y / canvasHeight).toFixed(4),
                            right_x: (endPoint.x / canvasWidth).toFixed(4),
                            right_y: (endPoint.y / canvasHeight).toFixed(4)
                        })
                        boxesTag.push({
                            x1: startPoint.x - 1,
                            y1: startPoint.y - 12 - 5,
                            x2: startPoint.x - 1 + ctx.measureText(globalThis.state.currentClass).width + 5,
                            y2: startPoint.y - 12 - 5 + 16
                        })
                    }
                    currentAnnotation.box = boxes
                    globalThis.props.getCurrentAnnotation(currentAnnotation)
                    globalThis.drawAllBoxes(currentAnnotation.box)
                } else {
                    if (hoverBoxIndex !== -1) {
                        currentAnnotation.box.splice(hoverBoxIndex, 1)
                        boxesTag.splice(hoverBoxIndex, 1)
                        globalThis.props.getCurrentAnnotation(currentAnnotation)
                        globalThis.drawAllBoxes(currentAnnotation.box)
                    }
                }
                painting = false
            }

        }
        if (this.props.editable) {
            DrawStart()
        }

        this.refs.imgContainer.insertBefore(canvas, this.refs.img)

        // 读取标框数据画出初始框
        if (this.props.currentAnnotation) {
            currentAnnotation.box = this.props.currentAnnotation.box
            globalThis.drawAllBoxes(currentAnnotation.box)
            globalThis.initBoxesTag(currentAnnotation.box)
        }
    }

    initBoxesTag(boxes) {
        const canvasWidth = this.refs.img.clientWidth
        const canvasHeight = this.refs.img.clientHeight
        boxesTag = []
        boxes.forEach(box => {
            boxesTag.push({
                x1: box.left_x * canvasWidth - 1,
                y1: box.left_y * canvasHeight - 12 - 5,
                x2: box.left_x * canvasWidth - 1 + ctx.measureText(box.class).width + 5,
                y2: box.left_y * canvasHeight - 12 - 5 + 16
            })
        })
    }

    onErrorLoaded() {
        this.setState({
            loaded: true
        })
    }


    render() {
        const antIcon = <Icon type="loading" style={{ fontSize: 24 }} spin />
        return (
            <div ref="imgContainer" style={{
                textAlign: 'center',
                position: 'relative',
                display: this.state.loaded ? 'flex' : '',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Spin indicator={antIcon} style={{ display: this.state.loaded && 'none' }} tip="图片加载中"></Spin>
                <img ref="img" src={this.state.src} onLoad={this.onLoaded.bind(this)} style={{ ...this.props.style, display: !this.state.loaded && 'none' }} onError={this.onErrorLoaded.bind(this)} alt="图片无法加载" ></img>
            </div>
        )
    }

}