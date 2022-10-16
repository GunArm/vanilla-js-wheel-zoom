import { extendObject, on, off, eventClientX, eventClientY, isTouch } from './toolkit';

/**
 * @class DragScrollable
 * @param {Object} windowObject
 * @param {Object} contentObject
 * @param {Object} options
 * @constructor
 */
function DragScrollable(windowObject, contentObject, options = {}) {
    this._dropHandler = this._dropHandler.bind(this);
    this._grabHandler = this._grabHandler.bind(this);
    this._moveHandler = this._moveHandler.bind(this);

    options.smoothExtinction = Number(options.smoothExtinction) || .25;

    this.options = extendObject({
        // smooth extinction
        smoothExtinction: .25,
        // callback triggered when grabbing an element
        onGrab: null,
        // callback triggered when moving an element
        onMove: null,
        // callback triggered when dropping an element
        onDrop: null,
    }, options);

    // check if we're using a touch screen
    this.isTouch = isTouch();
    // switch to touch events if using a touch screen
    this.events = this.isTouch
        ? { grab: 'touchstart', move: 'touchmove', drop: 'touchend' }
        : { grab: 'mousedown', move: 'mousemove', drop: 'mouseup' };
    // for the touch screen we set the parameter forcibly
    this.events.options = this.isTouch ? { passive: false } : false;

    this.window = windowObject;
    this.content = contentObject;

    on(this.content.$element, this.events.grab, this._grabHandler, this.events.options);
}

DragScrollable.prototype = {
    constructor: DragScrollable,
    window: null,
    content: null,
    isTouch: false,
    isGrab: false,
    events: null,
    moveTimer: null,
    options: {},
    coordinates: null,
    shift: null,
    /**
     * @param {Event} event
     * @private
     */
    _grabHandler(event) {
        // if touch started (only one finger) or pressed left mouse button
        if ((this.isTouch && event.touches.length === 1) || event.buttons === 1) {
            event.preventDefault();

            this.isGrab = true;
            this.coordinates = { left: eventClientX(event), top: eventClientY(event) };
            this.shift = { left: 0, top: 0 };

            on(document, this.events.drop, this._dropHandler, this.events.options);
            on(document, this.events.move, this._moveHandler, this.events.options);

            if (typeof this.options.onGrab === 'function') {
                this.options.onGrab(event);
            }
        }
    },
    /**
     * @param {Event} event
     * @private
     */
    _dropHandler(event) {
        event.preventDefault();

        this.isGrab = false;

        off(document, this.events.drop, this._dropHandler);
        off(document, this.events.move, this._moveHandler);

        if (typeof this.options.onDrop === 'function') {
            this.options.onDrop(event);
        }
    },
    /**
     * @param {Event} event
     * @returns {boolean}
     * @private
     */
    _moveHandler(event) {
        // so that it does not move when the touch screen and more than one finger
        if (this.isTouch && event.touches.length > 1) return false;

        event.preventDefault();

        const { window, content, shift, coordinates, options } = this;

        // change of the coordinate of the mouse cursor
        shift.left = eventClientX(event) - coordinates.left;
        shift.top = eventClientY(event) - coordinates.top;
        
        coordinates.left = eventClientX(event);
        coordinates.top = eventClientY(event);

        clearTimeout(this.moveTimer);

        // reset shift if cursor stops
        this.moveTimer = setTimeout(() => {
            shift.left = 0;
            shift.top = 0;
        }, 50);

        const contentNewLeft = content.currentLeft + shift.left;
        const contentNewTop = content.currentTop + shift.top;

        let maxAvailableLeft = (content.currentWidth - window.originalWidth) / 2 + content.correctX;
        let maxAvailableTop = (content.currentHeight - window.originalHeight) / 2 + content.correctY;

        // if we do not go beyond the permissible boundaries of the window
        if (Math.abs(contentNewLeft) <= maxAvailableLeft) content.currentLeft = contentNewLeft;

        // if we do not go beyond the permissible boundaries of the window
        if (Math.abs(contentNewTop) <= maxAvailableTop) content.currentTop = contentNewTop;

        transform(content.$element, {
            left: content.currentLeft,
            top: content.currentTop,
            scale: content.currentScale,
        }, this.options);

        if (typeof options.onMove === 'function') {
            options.onMove(event);
        }
    },
    destroy() {
        off(this.content.$element, this.events.grab, this._grabHandler, this.events.options);

        for (let key in this) {
            if (this.hasOwnProperty(key)) {
                this[key] = null;
            }
        }
    }
};

function transform($element, { left, top, scale }, options) {
    if (options.smoothExtinction) {
        $element.style.transition = `transform ${ options.smoothExtinction }s`;
    } else {
        $element.style.removeProperty('transition');
    }

    $element.style.transform = `translate3d(${ left }px, ${ top }px, 0px) scale(${ scale })`;
}

export default DragScrollable;
