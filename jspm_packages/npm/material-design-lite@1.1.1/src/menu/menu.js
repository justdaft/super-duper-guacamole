/* */ 
(function(process) {
  (function() {
    'use strict';
    var MaterialMenu = function MaterialMenu(element) {
      this.element_ = element;
      this.init();
    };
    window['MaterialMenu'] = MaterialMenu;
    MaterialMenu.prototype.Constant_ = {
      TRANSITION_DURATION_SECONDS: 0.3,
      TRANSITION_DURATION_FRACTION: 0.8,
      CLOSE_TIMEOUT: 150
    };
    MaterialMenu.prototype.Keycodes_ = {
      ENTER: 13,
      ESCAPE: 27,
      SPACE: 32,
      UP_ARROW: 38,
      DOWN_ARROW: 40
    };
    MaterialMenu.prototype.CssClasses_ = {
      CONTAINER: 'mdl-menu__container',
      OUTLINE: 'mdl-menu__outline',
      ITEM: 'mdl-menu__item',
      ITEM_RIPPLE_CONTAINER: 'mdl-menu__item-ripple-container',
      RIPPLE_EFFECT: 'mdl-js-ripple-effect',
      RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
      RIPPLE: 'mdl-ripple',
      IS_UPGRADED: 'is-upgraded',
      IS_VISIBLE: 'is-visible',
      IS_ANIMATING: 'is-animating',
      BOTTOM_LEFT: 'mdl-menu--bottom-left',
      BOTTOM_RIGHT: 'mdl-menu--bottom-right',
      TOP_LEFT: 'mdl-menu--top-left',
      TOP_RIGHT: 'mdl-menu--top-right',
      UNALIGNED: 'mdl-menu--unaligned'
    };
    MaterialMenu.prototype.init = function() {
      if (this.element_) {
        var container = document.createElement('div');
        container.classList.add(this.CssClasses_.CONTAINER);
        this.element_.parentElement.insertBefore(container, this.element_);
        this.element_.parentElement.removeChild(this.element_);
        container.appendChild(this.element_);
        this.container_ = container;
        var outline = document.createElement('div');
        outline.classList.add(this.CssClasses_.OUTLINE);
        this.outline_ = outline;
        container.insertBefore(outline, this.element_);
        var forElId = this.element_.getAttribute('for') || this.element_.getAttribute('data-mdl-for');
        var forEl = null;
        if (forElId) {
          forEl = document.getElementById(forElId);
          if (forEl) {
            this.forElement_ = forEl;
            forEl.addEventListener('click', this.handleForClick_.bind(this));
            forEl.addEventListener('keydown', this.handleForKeyboardEvent_.bind(this));
          }
        }
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM);
        this.boundItemKeydown_ = this.handleItemKeyboardEvent_.bind(this);
        this.boundItemClick_ = this.handleItemClick_.bind(this);
        for (var i = 0; i < items.length; i++) {
          items[i].addEventListener('click', this.boundItemClick_);
          items[i].tabIndex = '-1';
          items[i].addEventListener('keydown', this.boundItemKeydown_);
        }
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
          this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
          for (i = 0; i < items.length; i++) {
            var item = items[i];
            var rippleContainer = document.createElement('span');
            rippleContainer.classList.add(this.CssClasses_.ITEM_RIPPLE_CONTAINER);
            var ripple = document.createElement('span');
            ripple.classList.add(this.CssClasses_.RIPPLE);
            rippleContainer.appendChild(ripple);
            item.appendChild(rippleContainer);
            item.classList.add(this.CssClasses_.RIPPLE_EFFECT);
          }
        }
        if (this.element_.classList.contains(this.CssClasses_.BOTTOM_LEFT)) {
          this.outline_.classList.add(this.CssClasses_.BOTTOM_LEFT);
        }
        if (this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)) {
          this.outline_.classList.add(this.CssClasses_.BOTTOM_RIGHT);
        }
        if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT)) {
          this.outline_.classList.add(this.CssClasses_.TOP_LEFT);
        }
        if (this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
          this.outline_.classList.add(this.CssClasses_.TOP_RIGHT);
        }
        if (this.element_.classList.contains(this.CssClasses_.UNALIGNED)) {
          this.outline_.classList.add(this.CssClasses_.UNALIGNED);
        }
        container.classList.add(this.CssClasses_.IS_UPGRADED);
      }
    };
    MaterialMenu.prototype.handleForClick_ = function(evt) {
      if (this.element_ && this.forElement_) {
        var rect = this.forElement_.getBoundingClientRect();
        var forRect = this.forElement_.parentElement.getBoundingClientRect();
        if (this.element_.classList.contains(this.CssClasses_.UNALIGNED)) {} else if (this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)) {
          this.container_.style.right = (forRect.right - rect.right) + 'px';
          this.container_.style.top = this.forElement_.offsetTop + this.forElement_.offsetHeight + 'px';
        } else if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT)) {
          this.container_.style.left = this.forElement_.offsetLeft + 'px';
          this.container_.style.bottom = (forRect.bottom - rect.top) + 'px';
        } else if (this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
          this.container_.style.right = (forRect.right - rect.right) + 'px';
          this.container_.style.bottom = (forRect.bottom - rect.top) + 'px';
        } else {
          this.container_.style.left = this.forElement_.offsetLeft + 'px';
          this.container_.style.top = this.forElement_.offsetTop + this.forElement_.offsetHeight + 'px';
        }
      }
      this.toggle(evt);
    };
    MaterialMenu.prototype.handleForKeyboardEvent_ = function(evt) {
      if (this.element_ && this.container_ && this.forElement_) {
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM + ':not([disabled])');
        if (items && items.length > 0 && this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
          if (evt.keyCode === this.Keycodes_.UP_ARROW) {
            evt.preventDefault();
            items[items.length - 1].focus();
          } else if (evt.keyCode === this.Keycodes_.DOWN_ARROW) {
            evt.preventDefault();
            items[0].focus();
          }
        }
      }
    };
    MaterialMenu.prototype.handleItemKeyboardEvent_ = function(evt) {
      if (this.element_ && this.container_) {
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM + ':not([disabled])');
        if (items && items.length > 0 && this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
          var currentIndex = Array.prototype.slice.call(items).indexOf(evt.target);
          if (evt.keyCode === this.Keycodes_.UP_ARROW) {
            evt.preventDefault();
            if (currentIndex > 0) {
              items[currentIndex - 1].focus();
            } else {
              items[items.length - 1].focus();
            }
          } else if (evt.keyCode === this.Keycodes_.DOWN_ARROW) {
            evt.preventDefault();
            if (items.length > currentIndex + 1) {
              items[currentIndex + 1].focus();
            } else {
              items[0].focus();
            }
          } else if (evt.keyCode === this.Keycodes_.SPACE || evt.keyCode === this.Keycodes_.ENTER) {
            evt.preventDefault();
            var e = new MouseEvent('mousedown');
            evt.target.dispatchEvent(e);
            e = new MouseEvent('mouseup');
            evt.target.dispatchEvent(e);
            evt.target.click();
          } else if (evt.keyCode === this.Keycodes_.ESCAPE) {
            evt.preventDefault();
            this.hide();
          }
        }
      }
    };
    MaterialMenu.prototype.handleItemClick_ = function(evt) {
      if (evt.target.hasAttribute('disabled')) {
        evt.stopPropagation();
      } else {
        this.closing_ = true;
        window.setTimeout(function(evt) {
          this.hide();
          this.closing_ = false;
        }.bind(this), (this.Constant_.CLOSE_TIMEOUT));
      }
    };
    MaterialMenu.prototype.applyClip_ = function(height, width) {
      if (this.element_.classList.contains(this.CssClasses_.UNALIGNED)) {
        this.element_.style.clip = '';
      } else if (this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)) {
        this.element_.style.clip = 'rect(0 ' + width + 'px ' + '0 ' + width + 'px)';
      } else if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT)) {
        this.element_.style.clip = 'rect(' + height + 'px 0 ' + height + 'px 0)';
      } else if (this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
        this.element_.style.clip = 'rect(' + height + 'px ' + width + 'px ' + height + 'px ' + width + 'px)';
      } else {
        this.element_.style.clip = '';
      }
    };
    MaterialMenu.prototype.removeAnimationEndListener_ = function(evt) {
      evt.target.classList.remove(MaterialMenu.prototype.CssClasses_.IS_ANIMATING);
    };
    MaterialMenu.prototype.addAnimationEndListener_ = function() {
      this.element_.addEventListener('transitionend', this.removeAnimationEndListener_);
      this.element_.addEventListener('webkitTransitionEnd', this.removeAnimationEndListener_);
    };
    MaterialMenu.prototype.show = function(evt) {
      if (this.element_ && this.container_ && this.outline_) {
        var height = this.element_.getBoundingClientRect().height;
        var width = this.element_.getBoundingClientRect().width;
        this.container_.style.width = width + 'px';
        this.container_.style.height = height + 'px';
        this.outline_.style.width = width + 'px';
        this.outline_.style.height = height + 'px';
        var transitionDuration = this.Constant_.TRANSITION_DURATION_SECONDS * this.Constant_.TRANSITION_DURATION_FRACTION;
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM);
        for (var i = 0; i < items.length; i++) {
          var itemDelay = null;
          if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT) || this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
            itemDelay = ((height - items[i].offsetTop - items[i].offsetHeight) / height * transitionDuration) + 's';
          } else {
            itemDelay = (items[i].offsetTop / height * transitionDuration) + 's';
          }
          items[i].style.transitionDelay = itemDelay;
        }
        this.applyClip_(height, width);
        window.requestAnimationFrame(function() {
          this.element_.classList.add(this.CssClasses_.IS_ANIMATING);
          this.element_.style.clip = 'rect(0 ' + width + 'px ' + height + 'px 0)';
          this.container_.classList.add(this.CssClasses_.IS_VISIBLE);
        }.bind(this));
        this.addAnimationEndListener_();
        var callback = function(e) {
          if (e !== evt && !this.closing_ && e.target.parentNode !== this.element_) {
            document.removeEventListener('click', callback);
            this.hide();
          }
        }.bind(this);
        document.addEventListener('click', callback);
      }
    };
    MaterialMenu.prototype['show'] = MaterialMenu.prototype.show;
    MaterialMenu.prototype.hide = function() {
      if (this.element_ && this.container_ && this.outline_) {
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM);
        for (var i = 0; i < items.length; i++) {
          items[i].style.removeProperty('transition-delay');
        }
        var rect = this.element_.getBoundingClientRect();
        var height = rect.height;
        var width = rect.width;
        this.element_.classList.add(this.CssClasses_.IS_ANIMATING);
        this.applyClip_(height, width);
        this.container_.classList.remove(this.CssClasses_.IS_VISIBLE);
        this.addAnimationEndListener_();
      }
    };
    MaterialMenu.prototype['hide'] = MaterialMenu.prototype.hide;
    MaterialMenu.prototype.toggle = function(evt) {
      if (this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
        this.hide();
      } else {
        this.show(evt);
      }
    };
    MaterialMenu.prototype['toggle'] = MaterialMenu.prototype.toggle;
    componentHandler.register({
      constructor: MaterialMenu,
      classAsString: 'MaterialMenu',
      cssClass: 'mdl-js-menu',
      widget: true
    });
  })();
})(require('process'));
