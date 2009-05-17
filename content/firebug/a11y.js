/* See license.txt for terms of usage */

FBL.ns( function()
{
    with (FBL)
    {
        Firebug.A11yModel = extend(Firebug.ActivableModule, {

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Module Management

            dispatchName: "a11y",
            panelName: "a11y", // We don't have a panel, but we ActivableModule expects one

            initialize : function()
            {
                this.handleTabBarFocus = bind(this.handleTabBarFocus, this);
                this.handleTabBarBlur = bind(this.handleTabBarBlur, this);
                this.handlePanelBarKeyPress = bind(this.handlePanelBarKeyPress, this);
                this.onConsoleKeyPress = bind(this.onConsoleKeyPress, this);
                this.onLayoutKeyPress = bind(this.onLayoutKeyPress, this);
                this.onCSSKeyPress = bind(this.onCSSKeyPress, this);
                this.onCSSMouseDown = bind(this.onCSSMouseDown, this);
                this.onHTMLKeyPress = bind(this.onHTMLKeyPress, this);
                this.onHTMLFocus = bind(this.onHTMLFocus, this);
                this.onHTMLBlur = bind(this.onHTMLBlur, this);
                this.onPanelFocus = bind(this.onPanelFocus, this);
                this.onLayoutFocus = bind(this.onLayoutFocus, this);
                this.onLayoutBlur = bind(this.onLayoutBlur, this);
                this.onScriptContextMenu = bind(this.onScriptContextMenu, this);
                this.onCSSPanelContextMenu = bind(this.onCSSPanelContextMenu, this);
                this.onScriptKeyPress = bind(this.onScriptKeyPress, this);
                Firebug.Debugger.addListener(this);

                //this.enabled and this.isEnabled() are not set yet when console and script panels load the first time. Set it manually until they are
                this.enabled = Firebug.getPref("extensions.firebug.a11y", "enableSites");
            },

            onPanelEnable : function(context, panelName)
            {
                if (panelName == "a11y")
                    this.set(true, context.chrome);
            },

            onPanelDisable : function(context, panelName)
            {
                if (panelName == "a11y" && context.chrome.window.a11yEnabled)
                    this.set(false, context.chrome);
            },

            reattachContext: function(browser, context)
            {
                if (this.isEnabled())
                    this.set(true, context.chrome);
            },

            toggle : function(currentlyChecked)
            {
                if (currentlyChecked)
                    Firebug.ModuleManager.disableModule(this);
                else
                    Firebug.ModuleManager.enableModule(this);
            },

            set : function(enable, chrome)
            {
                if (enable)
                    this.performEnable(chrome);
                else
                    this.performDisable(chrome);
                chrome.window.a11yEnabled = enable;
                $('cmd_enableA11y').setAttribute('checked', enable);
            },

            performEnable : function(chrome)
            {
                //add class used by all a11y related css styles (e.g. :focus and -moz-user-focus styles)
                setClass(chrome.$('fbContentBox'), 'useA11y');
                setClass(chrome.$('fbStatusBar'), 'useA11y');

                //manage all key events in toolbox (including tablists)
                chrome.$("fbPanelBar1").addEventListener("keypress", this.handlePanelBarKeyPress , true);
                //make focus stick to inspect button when clicked
                chrome.$("fbInspectButton").addEventListener("mousedown", this.focusTarget, true);
                chrome.$('fbPanelBar1-panelTabs').addEventListener('focus', this.handleTabBarFocus, true);
                chrome.$('fbPanelBar1-panelTabs').addEventListener('blur', this.handleTabBarBlur, true);
                chrome.$('fbPanelBar2-panelTabs').addEventListener('focus', this.handleTabBarFocus, true);
                chrome.$('fbPanelBar2-panelTabs').addEventListener('blur', this.handleTabBarBlur, true);
                setClass(chrome.$("fbPanelBar1").browser.contentDocument.body, 'useA11y');
                setClass(chrome.$("fbPanelBar2").browser.contentDocument.body, 'useA11y');
                Firebug.Editor.addListener(this);
            },

            performDisable : function(chrome)
            {   //undo everything we did in performEnable
                removeClass(chrome.$('fbContentBox'), 'useA11y');
                removeClass(chrome.$('fbStatusBar'), 'useA11y');
                chrome.$("fbPanelBar1").removeEventListener("keypress", this.handlePanelBarKeyPress , true);
                chrome.$("fbInspectButton").removeEventListener("mousedown", this.focusTarget, true);
                chrome.$('fbPanelBar1-panelTabs').removeEventListener('focus', this.handleTabBarFocus, true);
                chrome.$('fbPanelBar1-panelTabs').removeEventListener('blur', this.handleTabBarBlur, true);
                chrome.$('fbPanelBar2-panelTabs').removeEventListener('focus', this.handleTabBarFocus, true);
                chrome.$('fbPanelBar2-panelTabs').removeEventListener('blur', this.handleTabBarBlur, true);
                removeClass(chrome.$("fbPanelBar1").browser.contentDocument.body, 'useA11y');
                removeClass(chrome.$("fbPanelBar2").browser.contentDocument.body, 'useA11y');
                Firebug.Editor.removeListener(this);
                chrome.$("fbPanelBar1").browser.setAttribute('showcaret', false);
            },

             // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
             // Context & Panel Management

            onInitializeNode : function(panel, actAsPanel)
            {
                var panelA11y = this.getPanelA11y(panel, true);
                if (!panelA11y)
                    return;
                panelA11y.tabStop = null;
                panelA11y.manageFocus = false;
                panelA11y.lastIsDefault = false;
                actAsPanel = actAsPanel ? actAsPanel : panel.name;
                //panel.panelNode.ownerDocument.addEventListener("focus", this.reportFocus, true);
                this.makeFocusable(panel.panelNode, false);
                switch (actAsPanel)
                {
                    case 'console':
                        panelA11y.manageFocus = true;
                        if (panel.name == "console")
                            panelA11y.lastIsDefault = true;
                        panel.panelNode.setAttribute('role', 'list');
                        panel.panelNode.setAttribute('aria-live', 'polite');
                        panel.panelNode.addEventListener("keypress", this.onConsoleKeyPress, false);
                        panel.panelNode.addEventListener("focus", this.onPanelFocus, true);
                        if (panel.name == "breakpoints")
                            panel.panelNode.style.overflowX = "hidden";
                        break;
                    case 'html':
                        panel.panelNode.setAttribute('role', 'tree');
                        panel.panelNode.addEventListener("keypress", this.onHTMLKeyPress, false);
                        panel.panelNode.addEventListener("focus", this.onHTMLFocus, true);
                        panel.panelNode.addEventListener("blur", this.onHTMLBlur, true);
                        this.addLiveElem(panel);
                        break;
                    case 'css':
                        panelA11y.manageFocus = true;
                        panel.panelNode.addEventListener("keypress", this.onCSSKeyPress, false);
                        panel.panelNode.addEventListener("mousedown", this.onCSSMouseDown, false);
                        panel.panelNode.addEventListener("focus", this.onPanelFocus, true);
                        panel.panelNode.addEventListener('contextmenu', this.onCSSPanelContextMenu, false)
                        this.insertHiddenText(panel, panel.panelNode, $STR('overridden'), false, "CSSOverriddenDescription");
                        if (panel.name == "stylesheet")
                            panel.panelNode.setAttribute('role', 'list');
                        break;
                    case 'layout':
                        panelA11y.manageFocus = true;
                        panel.panelNode.addEventListener("keypress", this.onLayoutKeyPress, false);
                        panel.panelNode.addEventListener("focus", this.onLayoutFocus, true);
                        panel.panelNode.addEventListener("blur", this.onLayoutBlur, true);
                        this.insertHiddenText(panel, panel.panelNode, $STR('press enter to edit values'), false, "layoutPressEnterDesc");
                        break;
                    case 'script':
                        panel.panelNode.addEventListener('contextmenu', this.onScriptContextMenu, true);
                        panel.panelNode.addEventListener('keypress', this.onScriptKeyPress, true);
                        this.addLiveElem(panel);
                        break;
                }
            },

            onDestroyNode : function(panel, actAsPanel)
            {
                if (!this.isEnabled())
                    return;
                panel.context.a11yPanels = null;
                actAsPanel = actAsPanel ? actAsPanel : panel.name;
                //remove all event handlers we added in onInitializeNode
                switch (actAsPanel)
                {
                    case 'console':
                        panel.panelNode.removeEventListener("keypress", this.onConsoleKeyPress, false);
                        panel.panelNode.removeEventListener("focus", this.onPanelFocus, true);
                        break;
                    case 'html':
                        panel.panelNode.removeEventListener("keypress", this.onHTMLKeyPress, false);
                        panel.panelNode.removeEventListener("focus", this.onHTMLFocus, true);
                        panel.panelNode.removeEventListener("blur", this.onHTMLBlur, true);
                        break;
                    case 'css':
                        panel.panelNode.removeEventListener("keypress", this.onCSSKeyPress, false);
                        panel.panelNode.removeEventListener("mousedown", this.onCSSMouseDown, false);
                        panel.panelNode.removeEventListener("focus", this.onPanelFocus, true);
                        panel.panelNode.removeEventListener("blur", this.onPanelBlur, true);
                        panel.panelNode.removeEventListener('contextmenu', this.onCSSPanelContextMenu, false)
                        break;
                    case 'layout':
                        panel.panelNode.removeEventListener("keypress", this.onLayoutKeyPress, false);
                        panel.panelNode.removeEventListener("focus", this.onLayoutFocus, true);
                        panel.panelNode.removeEventListener("blur", this.onLayoutBlur, true);
                        break;
                    case 'script':
                        panel.panelNode.removeEventListener('contextmenu', this.onScriptContextMenu, false);
                        panel.panelNode.removeEventListener('keypress', this.onScriptKeyPress, true)
                        break;
                }
            },

            showPanel : function(browser, panel)
            {
                if (!this.isEnabled())
                    return;
                panel.context.chrome.$('fbToolbar').setAttribute('aria-label', panel.name + " " + $STR("panel tools"))
                var panelBrowser = panel.context.chrome.getPanelBrowser(panel);
                panelBrowser.setAttribute('showcaret', (panel.name == "script"));
            },

            addLiveElem : function(panel, role, politeness)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var attrName = attrValue = "";
                if (role)
                {
                    attrName = 'role';
                    attrValue = role;
                }
                else
                {
                    attrName = "aria-live";
                    attrValue = politeness ? politeness : 'polite';
                }
                var elem = panel.document.createElement('div');
                elem.setAttribute(attrName, attrValue);
                elem.className = "offScreen";
                panel.panelNode.appendChild(elem);
                panelA11y[role ? role + "Elem" : "liveElem"] = elem;
                return elem;
            },

            updateLiveElem: function(panel, msg, useAlert)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var elem = panelA11y.liveElem;
                if (!elem)
                    elem = this.addLiveElem(panel);
                elem.textContent = msg;
                if (useAlert)
                    elem.setAttribute('role', 'alert');
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Toolbars & Tablists

            focusTarget : function(event)
            {
                this.focus(event.target);
            },

            handlePanelBarKeyPress : function (event)
            {
                var target = event.originalTarget;
                var isTab = target.nodeName.toLowerCase() == "paneltab";
                var isButton = target.nodeName.search(/(xul:)?toolbarbutton/) != -1;
                var isDropDownMenu = isButton && target.getAttribute('type') == "menu";
                var siblingTab, forward, toolbar, buttons;
                var keyCode = event.keyCode || event.charCode;

                if (keyCode == KeyEvent.DOM_VK_TAB)
                    this.ensurePanelTabStops(); //TODO: need a better solution to prevent loss of panel tabstop

                if (isTab || isButton )
                {
                    switch (keyCode)
                    {
                        case KeyEvent.DOM_VK_LEFT:
                        case KeyEvent.DOM_VK_RIGHT:
                            forward = event.keyCode == KeyEvent.DOM_VK_RIGHT;
                            if (isTab)
                            {
                                //will only work as long as long as siblings only consist of paneltab elements
                                siblingTab = target[forward ? 'nextSibling' : 'previousSibling'];
                                if (!siblingTab)
                                    siblingTab = target.parentNode[forward ? 'firstChild' : 'lastChild'];
                                if (siblingTab)
                                {
                                    var panelBar = getAncestorByClass(target, 'panelBar')
                                    setTimeout(bindFixed(function()
                                    {
                                        panelBar.selectTab(siblingTab);
                                        this.focus(siblingTab);
                                    }, this));
                                }
                           }
                           else if (isButton)
                           {
                               if (target.id=="fbFirebugMenu" && !forward)
                               {
                                    cancelEvent(event);
                                    return;
                               }
                               toolbar = getAncestorByClass(target, 'innerToolbar');
                               if (toolbar)
                               {
                                   var doc = target.ownerDocument;
                                   //temporarily make all buttons in the toolbar part of the tab order,
                                   //to allow smooth, native focus advancement
                                   setClass(toolbar, 'hasTabOrder');
                                   doc.commandDispatcher[forward ? 'advanceFocus' : 'rewindFocus']();
                                   //Very ugly hack, but it works well. This prevents focus to 'spill out' of a
                                   //toolbar when using the left and right arrow keys
                                   if (!isAncestor(doc.commandDispatcher.focusedElement, toolbar))
                                   {
                                       //we moved focus to somewhere out of the toolbar: not good. Move it back to where it was.
                                       doc.commandDispatcher[!forward ? 'advanceFocus' : 'rewindFocus']();
                                   }
                                   //remove the buttons from the tab order again, so that it will remain uncluttered
                                   removeClass(toolbar, 'hasTabOrder');
                               }
                                cancelEvent(event);
                                return;
                           }
                        break;
                        case KeyEvent.DOM_VK_RETURN:
                        case KeyEvent.DOM_VK_SPACE:
                        case KeyEvent.DOM_VK_UP:
                        case KeyEvent.DOM_VK_DOWN:
                            if (isTab && target.tabMenu)
                                target.tabMenu.popup.showPopup(target.tabMenu, -1, -1, "popup", "bottomleft", "topleft");
                            else if (isButton)
                            {
                                if (isDropDownMenu)
                                    target.open = true;
                                cancelEvent(event);
                                return false;
                            }
                        break;
                        case KeyEvent.DOM_VK_F4:
                            if (isTab && target.tabMenu)
                                target.tabMenu.popup.showPopup(target.tabMenu, -1, -1, "popup", "bottomleft", "topleft");
                        break;
                    }
                }
            },

            handleTabBarFocus: function(event)
            {
                this.tabFocused = true;
            },

            handleTabBarBlur: function(event)
            {
                this.tabFocused = false;
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Panel Focus & Tab Order Management

            getPanelTabStop : function(panel)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (panelA11y)
                    return panelA11y.tabStop;
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("a11y.getPanelTabStop null panel.context");
                return null;
            },

            ensurePanelTabStops: function()
            {
                var panel = context.chrome.getSelectedPanel();
                var sidePanel = context.chrome.getSelectedSidePanel();
                this.ensurePanelTabStop(panel);
                if (sidePanel)
                    this.ensurePanelTabStop(sidePanel);
            },

            ensurePanelTabStop: function(panel)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                if (panelA11y.manageFocus)
                {
                    var tabStop = this.getPanelTabStop(panel);
                    if (!tabStop || !this.isVisbleByStyle(tabStop) || !isVisible(tabStop))
                    {
                        this.tabStop = null;
                        this.findPanelTabStop(panel, 'focusRow', panelA11y.lastIsDefault);
                    }
                    else if (tabStop.getAttribute('tabindex') !== "0")
                        tabStop.setAttribute('tabindex', "0");
                }
            },

            setPanelTabStop : function (panel, elem)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var tabStop = this.getPanelTabStop(panel)
                if (tabStop)
                    this.makeFocusable(tabStop, false);
                panelA11y.tabStop = elem;
                if (elem)
                {
                    panelA11y.reFocusId = null;
                    this.makeFocusable(elem, true);
                }
            },

            findPanelTabStop : function(panel, className, last)
            {
                var candidates = panel.panelNode.getElementsByClassName(className);
                if (candidates.length > 0)
                    this.setPanelTabStop(panel, candidates[last ? candidates.length -1 : 0]);
                else
                    this.setPanelTabStop(panel, null);
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Console Panel

            onLogRowsCreated : function(panel, rows)
            {
                for ( var i = 0; i < rows.length; i++)
                {
                    this.onLogRowCreated (panel, rows[i]);
                }
            },

            onLogRowCreated : function(panel, row)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                if (hasClass(row, 'logRow-dir'))
                {
                    row.setAttribute('role', 'listitem');
                    var memberRows = row.getElementsByClassName('memberRow');
                    if (memberRows.length > 0)
                    {
                        this.onMemberRowsAdded(panel, memberRows);
                    }
                }
                else if (hasClass(row, 'logRow-group'))
                    row.setAttribute('role', 'presentation');
                else
                {
                    row.setAttribute('role', 'listitem');
                    var logRowType = this.getLogRowType(row);
                    if (logRowType)
                        this.insertHiddenText(panel, row, logRowType + ": ")
                    setClass(row, 'focusRow');
                    this.setPanelTabStop(panel, row);
                    this.onLogRowContentCreated(panel, row);
                }
            },

            onLogRowContentCreated : function(panel, node)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var focusObjects = this.getFocusObjects(node);
                Array.forEach(focusObjects, function(e,i,a){
                    this.makeFocusable(e);
                    var prepend = "";
                    var append = " (" + this.getObjectType(e) + ") ";
                    if (hasClass(e, 'errorTitle'))
                        prepend += $STR('expand error') + ': ';
                    e.setAttribute('aria-label', prepend + e.textContent + append);
                    }, this);
            },

            onConsoleKeyPress : function(event)
            {
                var target = event.target;
                var keyCode = event.keyCode || event.charCode;

                if (!this.isTabWorthy(target) && !this.isFocusNoTabObject(target))
                    return;
                else if (event.shiftKey || event.altKey)
                    return;
                else if ([13, 32, 33, 34, 35, 36, 37, 38, 39, 40, 46].indexOf(keyCode) == -1)
                    return;//not interested in any other keys, than arrows, pg, home/end, del space & enter
                var panel = Firebug.getElementPanel(target)

                var newTarget = target
                if (!this.isLogRow(target))
                {
                    if (!this.isDirCell(target))
                        newTarget = this.getAncestorRow(target);
                    else if (event.ctrlKey)
                    {
                        newTarget = this.getAncestorRow(target);
                        if (newTarget)
                            newTarget = [33, 38].indexOf(keyCode) == -1 ? this.getLastFocusChild(newTarget) : this.getFirstFocusChild(newTarget)
                    }
                    if (!newTarget)
                        newTarget = target
                }
                switch (keyCode)
                {
                    case 38://up
                    case 40://down
                    if (!this.isFocusNoTabObject(target))
                    {
                        this.focusSiblingRow(panel, newTarget, keyCode == 38);
                        cancelEvent(event);
                    }
                        break;
                    case 37://left
                    case 39://right
                        var goLeft = keyCode == 37
                        if (this.isLogRow(target))
                        {
                            if (hasClass(target, 'logGroupLabel') && target.getAttribute('aria-expanded') == (goLeft ? "true" : "false"))
                                this.dispatchMouseEvent(target, 'mousedown');
                            else if (!goLeft)
                            {
                                var focusItems = this.getFocusObjects(target);
                                if (focusItems.length > 0)
                                    this.focus(event.ctrlKey ? focusItems[focusItems.length -1] : focusItems[0]);
                            }
                            cancelEvent(event);
                        }
                        else if (this.isDirCell(target))
                        {
                            var row = getAncestorByClass(target, 'memberRow');
                            var toggleElem = getChildByClass(row.cells[0], "memberLabel")
                            if (!goLeft && hasClass(row, 'hasChildren'))
                            {
                                if (hasClass(row, 'opened'))
                                    this.focusSiblingRow(panel, target , false);
                                else if (toggleElem)
                                {
                                    if (hasClass(row, 'hasChildren'))
                                        target.setAttribute('aria-expanded', 'true');
                                    this.dispatchMouseEvent(toggleElem, 'click');
                                }
                            }
                            else if (goLeft)
                            {
                                var level = parseInt(row.getAttribute("level"));
                                if (hasClass(row, 'opened'))
                                {
                                    if (hasClass(row, 'hasChildren'))
                                        target.setAttribute('aria-expanded', 'false');
                                    this.dispatchMouseEvent(toggleElem, 'click');
                                }
                                else if (level > 0)
                                {
                                    var targetLevel = (level - 1) + "";
                                    var newRows = Array.filter(row.parentNode.rows, function(e,i,a){
                                        return e.rowIndex < row.rowIndex && e.getAttribute('level') == targetLevel;
                                        }, this);
                                    if (newRows.length)
                                        this.focus(newRows[newRows.length -1].cells[1].firstChild);
                                }
                            }
                            cancelEvent(event);
                        }
                        else if (this.isFocusObject(target))
                        {
                            var parentRow = newTarget;
                            var focusObjects = this.getFocusObjects(parentRow);
                            if (!event.ctrlKey)
                            {
                                var focusIndex = Array.indexOf(focusObjects, target);
                                var newIndex = goLeft ? --focusIndex : ++focusIndex;
                                if (goLeft && newIndex < 0)
                                    this.focus( parentRow);
                                else
                                    this.focus(focusObjects[newIndex]);
                            }
                            else
                                this.focus(goLeft ? parentRow : focusObjects[focusObjects.length -1]);
                            cancelEvent(event);
                        }
                        break;
                    case 35://end
                    case 36://home
                        this.focusEdgeRow(panel, newTarget, keyCode == 36);
                        cancelEvent(event);
                        break;
                    case 33://pgup
                    case 34://pgdn
                        this.focusPageSiblingRow(panel, newTarget, keyCode == 33);
                        cancelEvent(event);
                        break;
                    case 13://enter
                        if (this.isFocusObject(target))
                            this.dispatchMouseEvent(target, 'click');
                        else if(hasClass(target, 'watchEditBox'))
                        {
                            this.dispatchMouseEvent(target, 'mousedown');
                            cancelEvent(event);
                        }
                        else if (hasClass(target, 'breakpointRow'))
                        {
                            var sourceLink = getElementByClass(target, "objectLink-sourceLink");
                            if (sourceLink)
                                this.dispatchMouseEvent(sourceLink, 'click');
                        }
                        break;
                    case 32://space
                    if (this.isFocusObject(target) && target.hasAttribute('role', 'checkbox'))
                        this.dispatchMouseEvent(target, 'click');
                    else if (hasClass(target, 'breakpointRow'))
                    {
                        var checkbox = getElementByClass(target, 'breakpointCheckbox');
                        if (checkbox)
                        {
                            target.setAttribute('aria-checked', checkbox.checked ? "false" : "true");
                            this.dispatchMouseEvent(checkbox, 'click');
                        }
                    }
                    break;
                    case 46://del
                        if (hasClass(target, 'breakpointRow'))
                        {
                            var closeBtn = getElementByClass(target, 'closeButton');
                            if (closeBtn)
                            {
                                var prevBreakpoint = getPreviousByClass(target, 'breakpointRow');
                                if (prevBreakpoint)
                                    this.makeFocusable(prevBreakpoint, true);
                                panel.context.chrome.window.document.commandDispatcher.rewindFocus();
                                this.dispatchMouseEvent(closeBtn, 'click');
                            }
                        }
                        break;
                }

            },

            onPanelFocus : function(event)
            {
                var panel = Firebug.getElementPanel(event.target);
                if (this.isTabWorthy(event.target) && event.target !== this.getPanelTabStop(panel))
                    this.setPanelTabStop(panel, event.target)
            },

            getFocusRows : function(panel)
            {
                var nodes = panel.panelNode.getElementsByClassName('focusRow');
                return Array.filter(nodes, function(e,i,a){return this.isVisbleByStyle(e) && isVisible(e);}, this);
            },

            getLastFocusChild : function(target)
            {
                var focusChildren = target.getElementsByClassName('focusRow');
                return focusChildren[focusChildren.length -1];
            },

            getFirstFocusChild : function(target)
            {
                var focusChildren = target.getElementsByClassName('focusRow');
                return focusChildren[0];
            },

            getAncestorRow : function(target)
            {
                return getAncestorByClass(target, "logRow");
            },

            focusSiblingRow : function(panel, target, goUp)
            {
                var rows = this.getFocusRows(panel);
                var index = this.getRowIndex(rows, target);
                this.focus(this.getValidRow(rows, goUp ? --index : ++index));
            },

            focusPageSiblingRow : function(panel, target, goUp)
            {
                var rows = this.getFocusRows(panel);
                var index = this.getRowIndex(rows, target);
                this.focus(this.getValidRow(rows, goUp ? index - 10 : index + 10));
            },

            focusEdgeRow : function(panel, target, goUp)
            {
                var rows = this.getFocusRows(panel);
                this.focus(this.getValidRow(rows, goUp ? 0 : rows.length -1));
            },

            getRowIndex : function(rows, target)
            {
                return Array.indexOf(rows, target);
            },

            getValidRow : function(rows, index)
            {
                var min = 0; var max = rows.length -1;
                if (index < min || index > max)
                    index = index < min ? 0 : max;
                return rows[index];;
            },

            getFocusObjects : function(container)
            {
                var nodes = container.getElementsByClassName("a11yFocus")
                return Array.filter(nodes, this.isVisbleByStyle, this);
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // HTML Panel

            onHTMLKeyPress: function(event)
            {
                var target = event.target;
                var keyCode = event.keyCode || event.charCode;
                if ([13, 32, KeyEvent.DOM_VK_F2].indexOf(keyCode) == -1)
                    return;
                if (!hasClass(target, "nodeLabelBox"))
                    return;
                var panel = Firebug.getElementPanel(target);
                switch(keyCode)
                {
                    case 13:
                    case 32:
                        var isEnter = keyCode == 13;
                        var nodeLabels = null;
                        if (isEnter)
                        {
                            var nodeLabels = target.getElementsByClassName('nodeName');
                            if (nodeLabels.length > 0)
                            {
                                Firebug.Editor.startEditing(nodeLabels[0]);
                                cancelEvent(event);
                            }
                        }
                        if (!isEnter || nodeLabels.length == 0)
                        {
                            var nodeBox = getAncestorByClass(target, 'nodeBox');
                            if (nodeBox.repObject && panel.editNewAttribute)
                            {
                                panel.editNewAttribute(nodeBox.repObject)
                                cancelEvent(event);
                            }
                        }
                        break;
                    case KeyEvent.DOM_VK_F2:
                        if (hasClass(target.parentNode.parentNode, 'textNodeBox'))
                        {
                            var textNode = getChildByClass(target, 'nodeText');
                            if (textNode)
                                Firebug.Editor.startEditing(textNode);
                        }
                        break;
                }
            },

            onHTMLFocus : function(event)
            {

                if (hasClass(event.target, 'nodeLabelBox'))
                {
                    this.dispatchMouseEvent(event.target, 'mouseover');
                    cancelEvent(event);
                }
            },

            onHTMLBlur : function(event)
            {
                if (hasClass(event.target, 'nodeLabelBox'))
                {
                    this.dispatchMouseEvent(event.target, 'mouseout');
                    cancelEvent(event);
                }
            },

            onObjectBoxSelected: function(objectBox)
            {
                if (!this.isEnabled())
                    return;
                var label = getElementByClass(objectBox.firstChild, 'nodeLabelBox');
                if (label) {
                    this.makeFocusable(label, true);
                    this.focus(label);
                }
            },

            onObjectBoxUnselected: function(objectBox)
            {
                if (!this.isEnabled())
                    return;
                var label = getElementByClass(objectBox.firstChild, 'nodeLabelBox');
                if (label) {
                    this.makeUnfocusable(label, true);
                }
            },

            onHTMLSearchMatchFound: function(panel, match)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var node = match.node;
                var elem;
                var matchFeedback = $STRF("match found for", [match.match[0]]) + " ";
                if (node.nodeType == 1)//element
                {
                    elem = node;
                    matchFeedback += $STRF("in element", [elem.nodeName]);
                }
                else if (node.nodeType == 2)//attribute
                {
                    elem = node.ownerElement;
                    matchFeedback += $STRF("in attribute", [node.nodeName, node.nodeValue, elem.nodeName]);
                }
                else if (node.nodeType == 3) // text
                {
                    elem = node.parentNode;
                    matchFeedback += $STRF("in text content", [match.match.input, elem.nodeName]);
                }
                matchFeedback += " " + $STRF("at path", [getElementTreeXPath(elem)]);
                this.updateLiveElem(panel, matchFeedback, true); //should not use alert
            },

            onHTMLSearchNoMatchFound: function(panel, text)
            {
                this.updateLiveElem(panel, $STRF('no matches found', [text]), true); //should not use alert
            },

            moveToSearchMatch: function(context)
            {
                if (!this.isEnabled() || !context || !context.chrome)
                    return;
                var panel = context.chrome.getSelectedPanel();
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y || !panel.searchable )
                    return;

                switch(panel.name)
                {
                    case 'html':

                        var match = panel.lastSearch.lastMatch;
                        if (!match)
                            return;

                        var nodeBox = panel.lastSearch.openToNode(match.node, match.isValue);
                        if (!nodeBox)
                            return;

                        nodeBox = getAncestorByClass(nodeBox, 'nodeBox');
                        panel.select(nodeBox.repObject, true);
                        break;
                }
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // CSS Panel

            onCSSKeyPress : function(event)
            {
                var target = event.target;
                var keyCode = event.keyCode || event.charCode;
                if (!this.isFocusRow(target))
                    return;
                else if (event.altKey)
                    return;
                else if ([13, 32, 33, 34, 35, 36, 38,  40].indexOf(keyCode) == -1)
                    return;//not interested in any other keys, than arrows, pg, home/end, space & enter
                var panel = Firebug.getElementPanel(target)
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                switch (keyCode)
                {
                    case 38://up
                    case 40://down
                        var goUp = keyCode == 38;
                        if (event.ctrlKey)
                        {
                            if (event.shiftKey)
                            {
                                var node = this[goUp ? 'getPreviousByClass' : 'getNextByClass'](target, 'cssInheritHeader', panel.panelNode);
                                if (node)
                                {
                                    this.modifyCssRow(panel, node);
                                    this.focus(node);
                                }
                                else if (goUp)
                                   this.focusEdgeCSSRow(panel, target, true);
                            }
                            else
                                this.focusSiblingHeadRow(panel, target, goUp);
                        }
                        else
                            this.focusSiblingCSSRow(panel, target, goUp);
                        break;
                    case 35://end
                    case 36://home
                        if (event.ctrlKey)
                            this.focusEdgeHeadRow(panel, target, keyCode == 36);
                        else
                            this.focusEdgeCSSRow(panel, target, keyCode == 36);
                        break;
                    case 33://pgup
                    case 34://pgdn
                        if (event.ctrlKey)
                            this.focusPageSiblingHeadRow(panel, target, keyCode == 33);
                        else
                            this.focusPageSiblingCSSRow(panel, target, keyCode == 33);
                        break;
                    case 13://enter
                        if (hasClass(target, 'cssProp'))
                        {
                            var node = getChildByClass(target, 'cssPropName');
                            if (node)
                                Firebug.Editor.startEditing(node);
                            cancelEvent(event);
                        }
                        else if (hasClass(target, 'cssHead'))
                        {
                            var node = getChildByClass(target, 'cssSelector');
                            if (node && hasClass(node, 'editable'))
                                Firebug.Editor.startEditing(node);
                            cancelEvent(event);
                        }
                        else if (hasClass(target, 'importRule'))
                        {
                            var node = getChildByClass(target, 'objectLink');
                            if (node)
                                this.dispatchMouseEvent(node, 'click');
                        }
                        break;
                    case 32://space
                        if (hasClass(target, 'cssProp'))
                        {
                            //our focus is about to be wiped out, we'll try to get it back after
                            panelA11y.reFocusId = getElementXPath(target);
                            panel.disablePropertyRow(target);
                            if (panel.name == "stylesheet")
                                target.setAttribute('aria-checked', !hasClass(target, 'disabledStyle'));
                            cancelEvent(event);
                        }
                        break;
                }
                if (!event.shiftKey)
                    event.preventDefault();
            },

            onCSSMouseDown : function(event)
            {
                var row = getAncestorByClass(event.target, 'focusRow');
                if (row)
                    this.modifyCssRow(Firebug.getElementPanel(row), row, false);
            },

            focusSiblingCSSRow : function(panel, target, goUp)
            {
                var newRow = this[goUp ? 'getPreviousByClass' : 'getNextByClass'](target, 'focusRow', panel.panelNode)
                if (!newRow)
                    return;
                this.modifyCssRow(panel, newRow, false);
                this.focus(newRow)
            },

            focusPageSiblingCSSRow : function(panel, target, goUp)
            {
                var rows = this.getFocusRows(panel);
                var index = this.getRowIndex(rows, target);
                var newRow = this.getValidRow(rows, goUp ? index - 10 : index + 10);
                this.modifyCssRow(panel, newRow, false);
                this.focus(newRow);
            },

            focusEdgeCSSRow : function(panel, target, goUp)
            {
                var rows = this.getFocusRows(panel);
                var newRow = this.getValidRow(rows, goUp ? 0 : rows.length -1);
                this.modifyCssRow(panel, newRow, false);
                this.focus(newRow);
            },


            getHeadRowsAndIndex: function(panel, elem)
            {
                var rows = this.getFocusRows(panel);
                var headRow = hasClass(elem, 'cssHead') ? elem : getPreviousByClass(elem, 'cssHead');
                var headRows = Array.filter(rows, function(e,i,a){return hasClass(e, 'cssHead')});

                var index = Array.indexOf(headRows, headRow);
                if (index == -1)
                    index = 0;
                return [headRows, index]
            },

            focusSiblingHeadRow : function(panel, elem, goUp)
            {
                var rowInfo = this.getHeadRowsAndIndex(panel, elem);
                var newRow = this.getValidRow(rowInfo[0], goUp ? rowInfo[1] - 1 : rowInfo[1] + 1);
                this.modifyCssRow(panel, newRow, false);
                this.focus(newRow);
            },

            focusPageSiblingHeadRow : function(panel, elem, goUp)
            {
                var rowInfo = this.getHeadRowsAndIndex(panel, elem);
                var newRow = this.getValidRow(rowInfo[0], goUp ? rowInfo[1] - 10 : rowInfo[1] + 10);
                this.modifyCssRow(panel, newRow, false);
                this.focus(newRow);
            },

            focusEdgeHeadRow : function(panel, elem, goUp)
            {
                var rowInfo = this.getHeadRowsAndIndex(panel, elem);
                var newRow = this.getValidRow(rowInfo[0], goUp ? 0 : rowInfo[0].length - 1);
                this.modifyCssRow(panel, newRow, false);
                this.focus(newRow);
            },

            onBeforeCSSRulesAdded : function(panel)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y || !this.panelHasFocus(panel))
                    return;
                if (panelA11y.tabStop && hasClass(panelA11y.tabStop, 'focusRow'))
                    panelA11y.reFocusId = getElementXPath(panelA11y.tabStop);
            },

            onCSSRulesAdded : function(panel, rootNode)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var row;
                if (panelA11y.reFocusId)
                {
                    var reFocusRows = getElementsByXPath(rootNode.ownerDocument, panelA11y.reFocusId);
                    panelA11y.reFocusId = null;
                    if (reFocusRows.length > 0)
                    {

                        row = reFocusRows[0];
                        this.modifyCssRow(panel, row, true);
                        this.focus(row, true);
                        this.setPanelTabStop(panel, row);
                        return;
                    }

                }
                row = getElementByClass(rootNode, 'focusRow');
                this.modifyCssRow(panel, row, true);
                return;
            },

            modifyCssRow : function(panel, row, inTabOrder)
            {
                if (!panel || !row)
                    return;
                var rule = getAncestorByClass(row, "cssRule");
                this.makeFocusable(row, inTabOrder);
                if (hasClass(rule, 'a11yModified'))
                    return;
                if (hasClass(row, 'cssHead'))
                {
                    if (panel.name == "css")
                    {
                        var sourceLink = rule.lastChild;
                        if (sourceLink && hasClass(sourceLink, "objectLink"))
                            row.setAttribute('aria-label', row.textContent + " " + $STRF('defined in file', [sourceLink.textContent]));
                    }
                    var listBox = getChildByClass(row.nextSibling, 'cssPropertyListBox');
                    var selector = getChildByClass(row, 'cssSelector');
                    if (listBox && selector)
                        listBox.setAttribute('aria-label', $STRF("declarations for selector", [selector.textContent]));
                }
                else if (hasClass(row, 'cssProp'))
                {
                    row.setAttribute('aria-checked', !hasClass(row, 'disabledStyle'));
                    if (hasClass(row, 'cssOverridden'))
                        row.setAttribute('aria-label', $STR('overridden') + " " + row.textContent);
                }
                setClass(rule, 'a11yModified');
                return;
            },

            onCSSPanelContextMenu : function(event)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                if (event.button == 0) //the event was created by keyboard, not right mouse click
                {
                    var panel = Firebug.getElementPanel(event.target);
                    if (panel && hasClass(event.target, 'focusRow'))
                    {
                        var node = event.target;
                        if (panel.name == "css")
                        {
                            if (hasClass(event.target, 'cssHead'))
                                node = getElementByClass(event.target.parentNode, 'objectLink');
                            else if (hasClass(event.target, 'cssInheritHeader'))
                                node = getElementByClass(event.target, 'objectLink');
                            if (!node || hasClass(node, 'collapsed'))
                                node = event.target;
                        }
                        //these context menu options are likely to destroy current focus
                        panelA11y.reFocusId = getElementXPath(event.target);
                        document.popupNode = node;
                        panel.context.chrome.$('fbContextMenu').openPopup(node, 'overlap', 0,0,true);
                        cancelEvent(event); //no need for default handlers anymore
                    }
                }
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Layout Panel

            onLayoutBoxCreated : function(panel, node, detailsObj)
            {
                if (!this.isEnabled())
                    return;
                var focusGroups = node.getElementsByClassName('focusGroup');
                Array.forEach(focusGroups, function(e,i,a){
                    if (hasClass(e, 'offsetLayoutBox'))
                        this.makeFocusable(e, true);
                    else
                        this.makeFocusable(e, false);
                    e.setAttribute('role', 'group');
                    e.setAttribute('aria-describedby', 'layoutPressEnterDesc');
                    e.setAttribute('aria-label', this.getLayoutBoxLabel(e, detailsObj));
                    e.setAttribute('aria-setsize', a.length);
                    e.setAttribute('aria-posinset', i + 1);
                }, this);
            },

            getLayoutBoxLabel : function(elem, detailsObj )
            {
                //TODO: uncessesarily big, make smaller
                var className = elem.className.match(/\b(\w+)LayoutBox\b/);
                if (!className)
                    return "";
                var styleName = className[1];
                var output = "";
                switch(styleName)
                {
                    case "offset":
                        output += $STR("LayoutOffset");
                        styleName = "outer";
                        break;
                    case "margin":
                        output += $STR("LayoutMargin");
                        break;
                    case "border":
                        output += $STR("LayoutBorder");
                        break;
                    case "padding":
                        output += $STR("LayoutPadding");
                        break;
                    case "content":
                        output += $STR("LayoutSize");
                        break;
                }
                output += ": ";

                var valNames = [];
                var vals = {};
                if (styleName == "outer")
                {
                    valNames = ['top', 'left'];
                    vals.top = detailsObj[styleName + 'Top'];
                    vals.left = detailsObj[styleName + 'Left'];
                }
                else if (styleName == "content")
                {
                    valNames = ['width', 'height']
                    vals.width = detailsObj['width'];
                    vals.height = detailsObj['height'];
                }
                else
                {
                    valNames = ['top', 'right', 'bottom', 'left'];
                    vals.top = detailsObj[styleName + 'Top'];
                    vals.right = detailsObj[styleName + 'Right'];
                    vals.bottom = detailsObj[styleName + 'Bottom'];
                    vals.left = detailsObj[styleName + 'Left'];
                }
                for (var i = 0 ; i < valNames.length; i++)
                {
                    output += $STR(valNames[i]) + " = " + vals[valNames[i]] + " ";
                }
                return output;
            },

            onLayoutKeyPress : function(event)
            {
                var target = event.target;
                var keyCode = event.keyCode || event.charCode;
                if ([13, 37, 38, 39, 40].indexOf(keyCode) == -1)
                    return;
                if (!hasClass(target, 'focusGroup'))
                    return;
                var panel = Firebug.getElementPanel(target);
                switch(keyCode)
                {
                    case 37:
                    case 38:
                    case 39:
                    case 40:
                        var node, goLeft = keyCode == 37 || keyCode == 38;
                        if (goLeft)
                            node = getAncestorByClass(target.parentNode, 'focusGroup');
                        else
                            node = getChildByClass(target, 'focusGroup');
                        if (node)
                            this.focus(node);
                        break;
                    case 13:
                        var editable = getElementByClass(target, 'editable');
                        if (editable)
                            Firebug.Editor.startEditing(editable);
                        cancelEvent(event);
                        break;
                }
            },

            onLayoutFocus : function(event)
            {
                if (hasClass(event.target, 'focusGroup'))
                {
                    this.dispatchMouseEvent(event.target, 'mouseover');
                    this.setPanelTabStop(Firebug.getElementPanel(event.target), event.target);
                }
            },

            onLayoutBlur : function(event)
            {
                if (hasClass(event.target, 'focusGroup'))
                    this.dispatchMouseEvent(event.target, 'mouseout');
            },

            onInlineEditorShow : function(panel, editor)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                //recreate the input element rather than reusing the old one, otherwise AT won't pick it up
                editor.input.onkeypress = editor.input.oninput = editor.input.onoverflow = null;
                editor.inputTag.replace({}, editor.box.childNodes[1].firstChild, editor);
                editor.input = editor.box.childNodes[1].firstChild.firstChild;
            },

            onBeginEditing : function(panel, editor, target, value)
            {
                switch (panel.name)
                {
                    case 'html':
                        var tagName= nodeName = null;
                        var setSize = posInSet = 0; var setElems;
                        var label = $STR("inline editor") + ": ";
                        if (hasClass(target, 'nodeName') || hasClass(target, 'nodeValue'))
                        {
                            var isName = hasClass(target, 'nodeName');
                            setElems = target.parentNode.parentNode.getElementsByClassName(isName ? 'nodeName' : 'nodeValue');
                            setSize = (setElems.length * 2);
                            posInSet = ((Array.indexOf(setElems, target) + 1) * 2) - (isName ? 1 : 0);
                            editor.input.setAttribute('role', 'listitem');
                            editor.input.setAttribute('aria-editable', 'true');
                            editor.input.setAttribute('aria-setsize', setSize);
                            editor.input.setAttribute('aria-posinset', posInSet);
                            nodeTag = getPreviousByClass(target, 'nodeTag');
                            if (!isName)
                            {
                                nodeName = getPreviousByClass(target, 'nodeName');
                                label += $STRF('value for attribute in element', [nodeName.textContent, nodeTag.textContent]);
                            }
                            else
                                label += $STRF("attribute for element", [nodeTag.textContent]);
                        }
                        else if (hasClass(target, 'nodeText'))
                        {
                            nodeTag = getPreviousByClass(target, 'nodeTag');
                            label += $STRF("text contents for element", [nodeTag.textContent]);
                        }
                        editor.input.setAttribute('aria-label', label);
                        break;
                    case 'css':
                    case 'stylesheet':
                        var selector = getPreviousByClass(target, 'cssSelector');
                        selector = selector ? selector.textContent : "";

                        var label = $STR("inline editor") + ": ";
                        if (hasClass(target, 'cssPropName'))
                            label += $STRF('property for selector', [selector]);
                        else if (hasClass(target, 'cssPropValue'))
                        {
                            var propName = getPreviousByClass(target, 'cssPropName');
                            propName = propName ? propName.textContent : "";
                            label += $STRF('value property in selector', [propName, selector]);
                        }
                        else if (hasClass(target, 'cssSelector'))
                            label += $STR('cssSelector');
                        editor.input.setAttribute('aria-label', label);
                        break;
                    case 'layout':
                        editor.input.setAttribute('aria-label', target.getAttribute('aria-label'));
                        break;
                    case 'dom':
                    case 'domSide':
                        if (target.cells && target.cells[0])
                            editor.input.setAttribute('aria-label', target.cells[0].textContent);
                        break;
                }
            },

            onInlineEditorClose  : function(panel, target, removeGroup)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                switch (panel.name)
                {
                    case 'layout':
                        var box = getAncestorByClass(target, 'focusGroup')
                        if (box)
                            this.focus(box, true);
                        break;
                    case 'css':
                    case 'stylesheet':
                        var node = target.parentNode;
                        if (removeGroup)
                            node = this.getPreviousByClass(node, 'focusRow', panel.panelNode);
                        if (node)
                        {
                            this.modifyCssRow(panel, node);
                            this.focus(node, true);
                        }
                        break;
                    case 'html':
                        var box = getAncestorByClass(target, 'nodeBox')
                        if (box)
                            panel.select(box.repObject, true);
                        break;
                    case 'watches':
                        var node = getElementByClass(target, 'watchEditBox');
                        if (node)
                            this.focus(node, true);
                        break;
                    case 'script':
                        panel.selectedSourceBox.focus();
                        break;
                }
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Script Panel

            onStop : function(context, frame, type,rv)
            {
                var panel = context.getPanel('script');
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var fileName =  frame.script.fileName.split("/");
                fileName = fileName.pop();
                var alertString = $STRF("scriptSuspendedOnLineInFile",[frame.line, frame.functionName, fileName]);
                this.updateLiveElem(context.getPanel('script'), alertString, true);
                this.onShowSourceLink(context.getPanel('script'), frame.line);
            },

            onShowSourceLink : function (panel, line)
            {
                if (!this.isEnabled())
                    return;
                var box = panel.selectedSourceBox;
                var viewport = getElementByClass(box, 'sourceViewport');
                if (viewport)
                {
                    this.focus(viewport);
                    this.insertCaretIntoLine(panel, box, line);
                }
            },

            onScriptKeyPress : function(event)
            {
                var target = event.target;
                var keyCode = event.keyCode || event.charCode;
                if (!hasClass(target, 'sourceViewport'))
                    return;
              if ([13, 33, 34, 35, 36, 37, 38, 39, 40].indexOf(keyCode) == -1)
                 return;
                var panel = Firebug.getElementPanel(target);
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var box = panel.selectedSourceBox
                var lastLineNo = box.lastViewableLine;
                var firstLineNo = box.firstViewableLine;
                var caretDetails = this.getNodeAndOffsetFromCaret(event.target.ownerDocument);
                switch(keyCode)
                {
                    case 38:
                    case 40:
                        var goUp = keyCode == 38

                        var lineNode = getAncestorByClass(caretDetails[0].parentNode, 'sourceRow');

                        if (!lineNode )
                            return;

                        if (event.ctrlKey)
                        {
                            box.scrollTop = goUp ? (box.scrollTop - box.lineHeight) : (box.scrollTop + box.lineHeight)
                            return;
                        }
                        var lineNo = parseInt(getElementByClass(lineNode, 'sourceLine').textContent);
                        if (goUp && (lineNo > (firstLineNo +  1)))
                            return;
                        else if (!goUp && (lineNo < (lastLineNo -  1)))
                            return;
                        panelA11y.caretOffset = caretDetails[1];
                        box.scrollTop = goUp ? (box.scrollTop - box.lineHeight) : (box.scrollTop + box.lineHeight)
                        break;
                    case 33://pgup
                    case 34://pgdn
                        box.scrollTop = keyCode == 33? (box.scrollTop - (box.lineHeight * box.viewableLines)) :
                                (box.scrollTop + (box.lineHeight * box.viewableLines))
                        cancelEvent(event);
                        break;
                    case 36://home
                    case 35://end
                        if (event.ctrlKey)
                        {
                            box.scrollTop = keyCode == 36? 0 : (box.scrollHeight - box.clientHeight);
                            cancelEvent(event);
                        }
                        if (keyCode == 36)
                        {
                            var lineNo = parseInt(getElementByClass(lineNode, 'sourceLine').textContent);
                            this.insertCaretIntoLine(panel, box, lineNo, 0);
                            cancelEvent(event);
                        }
                        break;
                    case 13:
                        var liveString = "";
                        var caretDetails = this.getNodeAndOffsetFromCaret(event.target.ownerDocument);
                        var lineNode = getAncestorByClass(caretDetails[0].parentNode, 'sourceRow');
                        var lineNo = parseInt(getElementByClass(lineNode, 'sourceLine').textContent);
                        liveString += "Line " + lineNo;
                        if (lineNode.getAttribute('breakpoint') == 'true')
                        {
                            var breakpointStr = ""
                            if (lineNode.getAttribute('disabledbreakpoint') == 'true')
                                breakpointStr += " disabled ";
                            if (lineNode.getAttribute('condition') == 'true')
                                breakpointStr += " conditional ";
                            liveString += ", " + $STRF('hasBreakpoint', [breakpointStr]);
                        }
                        if (lineNode.getAttribute('executable') == 'true')
                            liveString += ", executable";
                        if (lineNode.getAttribute('exeline') == 'true')
                            liveString += ", currently stopped";
                        var sourceText = getElementByClass(lineNode, 'sourceRowText');
                        if (sourceText)
                            liveString += ": " + sourceText.textContent;

                        this.updateLiveElem(panel, liveString, true); //should not use alert
                        break
                }
            },

            onBeforeViewportChange : function(panel, link, scrollUp)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var box = panel.selectedSourceBox;
                if (!box)
                    return;
                var scrolltoLine = scrollUp ? box.firstViewableLine + 1 : box.lastViewableLine - 1;
                var node = box.getLineNode(scrolltoLine);
                this.insertCaretIntoLine(panel, box,  scrolltoLine);
            },

            insertCaretIntoLine : function(panel, box, line, offset)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var node = box.getLineNode(line);

                if (!offset)
                {
                    if (panelA11y.caretOffset)
                        offset = panelA11y.caretOffset;
                    else
                        offset = 0;
                }
                var startNode = getElementByClass(node, 'sourceRowText')
                if (startNode && startNode.firstChild && startNode.firstChild.nodeType == 3)
                {
                    startNode = startNode.firstChild;
                    if (offset >= startNode.length)
                        offset = startNode.length - 1;
                }
                else
                {
                    startNode = node; // offset is now the number of nodes, not characters within a text node
                    offset = 1;
                }
                this.insertCaretToNode(panel, startNode, offset);
            },

            getNodeAndOffsetFromCaret : function(doc)
            {
                var sel = doc.defaultView.getSelection();
                return [sel.focusNode, sel.focusOffset];
            },

            onUpdateScriptLocation : function(panel, file)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var box = panel.selectedSourceBox
                var viewport = getElementByClass(panel.selectedSourceBox, 'sourceViewport');

                box.tabIndex = -1;
                viewport.tabIndex = 0;
                viewport.setAttribute('role', 'textbox');
                viewport.setAttribute('aria-multiline', 'true');
                viewport.setAttribute('aria-readonly', 'true');
                var fileName = file.href;
                var tokens = fileName.split("/");
                if (tokens.length > 1)
                    fileName = tokens[tokens.length - 1];
                viewport.setAttribute('aria-label', $STRF('source code for file', [fileName]));
                //bit ugly, but not sure how else I can get the caret into the sourcebox without a mouse
                var focusElem = panel.context.chrome.window.document.commandDispatcher.focusedElement;
                var line = box.getLineNode(box.firstViewableLine);
                if (!line)
                    return;

                var node = getElementByClass(line, "sourceRowText");
                this.insertCaretToNode(panel, node);
                this.focus(focusElem); // move focus back to where it was
            },

            insertCaretToNode : function(panel, node, startOffset)
            {
                if (!startOffset)
                    startOffset = 0;
                var sel = panel.document.defaultView.getSelection();
                sel.removeAllRanges();
                var range = panel.document.createRange();
                range.setStart(node, startOffset);
                range.setEnd(node, startOffset);
                sel.addRange(range);
            },

            onScriptContextMenu : function(event)
            {
                if (event.button == 0 ) //i.e. keyboard, not right mouse click
                {
                    //Try to find the line node based on the caret and manually trigger the context menu
                    var panel = Firebug.getElementPanel(event.target);
                    var sel = event.target.ownerDocument.defaultView.getSelection();
                    var node = sel.focusNode.parentNode;
                    panel.context.chrome.window.document.popupNode = node;
                    panel.context.chrome.$('fbContextMenu').openPopup(node, "overlap", 0, 0, true);
                    cancelEvent(event);
                }
            },

            onWatchPanelRefreshed : function(panel)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var watchEditTrigger = getElementByClass(panel.panelNode, 'watchEditCell');
                if (watchEditTrigger)
                    this.makeFocusable(watchEditTrigger, true);
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Breakpoints Panel

            onBreakRowsRefreshed : function(panel, rootNode)
            {
                var rows = rootNode.getElementsByClassName('focusRow');

                for ( var i = 0; i < rows.length; i++)
                {
                    this.makeFocusable(rows[i], i == 0);
                    if (i == 0)
                        this.setPanelTabStop(panel, rows[i]);
                }
                var groupHeaders = rootNode.getElementsByClassName('breakpointHeader');

                for ( i = 0; i < groupHeaders.length; i++)
                {
                    var listBox = getNextByClass(groupHeaders[i], 'breakpointsGroupListBox');
                    if (listBox)
                        listBox.setAttribute('aria-label', groupHeaders[i].textContent);
                }
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Dom Panel

            onMemberRowsAdded: function(panel, rows)
            {
                if (!panel)
                    panel = Firebug.getElementPanel(rows[0]);
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y || !rows)
                    return;
                var setSize
                var posInset;
                var setSize = rows.length;
                var posInset = 0;
                for (var i = 0; i < rows.length; i++)
                {
                    var makeTab = (panelA11y.lastIsDefault && i === rows.length - 1) || (!panelA11y.lastIsDefault && i === 0)
                    this.modifyMemberRow(panel, rows[i], makeTab, ++posInset, setSize);
                }
            },

            onMemberRowSliceAdded : function(panel, borderRows, posInSet, setSize)
            {
                if (!borderRows)
                    return;
                var startRow = borderRows[0];
                var endRow = borderRows[1];
                if (!panel)
                    panel = Firebug.getElementPanel(startRow);
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var reFocusId = panelA11y.reFocusId;
                var row = startRow;
                do
                {
                    this.modifyMemberRow(panel, row, false, posInSet++, setSize, reFocusId)
                    if (row === endRow)
                        break;
                }
                while (row = row.nextSibling);
            },

            modifyMemberRow : function(panel, row, makeTab, posInSet, setSize, reFocusId)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y|| !row)
                    return;
                var labelCell = row.cells[0];
                var valueCell = row.cells[1];
                if (!valueCell)
                    return;
                var cellChild = valueCell.firstChild;
                if (cellChild)
                {
                    if (hasClass(row, 'hasChildren'))
                        cellChild.setAttribute('aria-expanded', hasClass(row, 'opened'));
                    var type = this.getObjectType(cellChild)
                    if (makeTab)
                        this.setPanelTabStop(panel, cellChild);
                    else
                        this.makeFocusable(cellChild, false);

                    cellChild.setAttribute('role', 'treeitem');
                    cellChild.setAttribute('aria-level', parseInt(row.getAttribute('level')) + 1);
                    cellChild.setAttribute('aria-label', labelCell.textContent +
                         ": " + " " + valueCell.textContent + (type ? " (" + type + ")" : "" )) ;
                    if (posInSet && setSize)
                    {
                        cellChild.setAttribute('aria-setsize', setSize);
                        cellChild.setAttribute('aria-posinset', posInSet);
                    }
                    setClass(cellChild, 'focusRow');
                    if (typeof reFocusId == "number" && row.rowIndex == reFocusId)
                    {
                        this.setPanelTabStop(panel, cellChild)

                        this.focus(cellChild, true, true);
                        panelA11y.reFocusId = null;
                    }
                }
            },

            onBeforeDomUpdateSelection : function (panel)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                var focusNode = panel.document.activeElement;

                if (this.isDirCell(focusNode))
                    panelA11y.reFocusId = focusNode.parentNode.parentNode.rowIndex;
            },

            onWatchEndEditing : function(panel, row)
            {
                var panelA11y = this.getPanelA11y(panel);
                if (!panelA11y)
                    return;
                panelA11y.reFocusId = 2;

            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Domplate Management

            insertHiddenText : function(panel, elem, text, asLastNode, id)
            {
                var span = panel.document.createElement('span');
                span.className ="offScreen";
                span.textContent = text;
                if (id)
                    span.id = id;
                if (asLastNode)
                    elem.appendChild(span);
                else
                    elem.insertBefore(span, elem.firstChild);
            },

            getLogRowType : function(elem)
            {
                var type = "";
                var className = elem.className.match(/\logRow-(\w+)\b/);
                if (className)
                    type = className[1];
                return type;
            },

            getObjectType : function(elem)
            {
                var type = "";
                var className = elem.className.match(/\bobject(Box|Link)-(\w+)/);
                if (className)
                    type = className[2];
                if (type == "null" || type == "undefined")
                    type = "";
                else if (type == "number" && (elem.textContent == "true" || elem.textContent == "false"))
                    type = "boolean";
                else if ((type == "" || type == "object") && elem.repObject)
                {
                    var obj = elem.repObject;
                    type = typeof obj;
                    if (obj instanceof Array)
                        type = "array";
                }
                return type;
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Utils

            focus : function(elem, noVisiCheck, needsMoreTime)
            {
                if (isElement(elem) && (noVisiCheck || this.isVisbleByStyle(elem)))
                    context.setTimeout(function(){
                        elem.focus()
                        }, needsMoreTime ? 500 :10);
            },

            makeFocusable : function(elem, inTabOrder)
            {
                if (elem)
                    elem.setAttribute('tabindex', inTabOrder ? '0' : '-1');
            },

            makeUnfocusable : function(elem)
            {
                if (elem)
                    elem.removeAttribute('tabindex');
            },

            reportFocus : function(event)
            {
                FBTrace.sysout('focus: ' + event.target.nodeName + "#" + event.target.id + "." + event.target.className, event.target);
            },

            dispatchMouseEvent : function (node, eventType, clientX, clientY)
            {
                if (!clientX)
                    clientX = 0;
                if (!clientY)
                    clientY = 0;
                if (typeof node == "string")
                    node = $(node);
                var doc = node.ownerDocument;
                var event = doc.createEvent('MouseEvents');
                event.initMouseEvent(eventType, true, true, doc.defaultView,
                    0, 0, 0, clientX, clientY, false, false, false, false, 0, null);
                node.dispatchEvent(event);
            },

            isVisbleByStyle : function (elem)
            {
                var style = elem.ownerDocument.defaultView.getComputedStyle(elem, null);
                return style.visibility !== "hidden" && style.display !== "none" ;
            },

            isTabWorthy : function (elem)
            {
                return this.isFocusRow(elem) || this.isFocusObject(elem);
            },

            isLogRow : function(elem)
            {
                return hasClass(elem, 'logRow');
            },

            isFocusRow : function(elem)
            {
                return hasClass(elem, 'focusRow');
            },

            isFocusObject : function(elem) {
                return hasClass(elem, 'a11yFocus');
            },

            isFocusNoTabObject : function(elem) {
                return hasClass(elem, 'a11yFocusNoTab');
            },

            isDirCell : function(elem) {
                return hasClass(elem.parentNode, 'memberValueCell');
            },

            panelHasFocus : function(panel)
            {
                if (!panel || !panel.context)
                    return false;
                var focusedElement = panel.context.chrome.window.document.commandDispatcher.focusedElement;
                var focusedPanel = Firebug.getElementPanel(focusedElement)
                return focusedPanel && (focusedPanel.name == panel.name);

            },

            getPreviousByClass: function(elem, className, rootNode)
            {
                function iter(node) { return node.nodeType == 1 && hasClass(node, className); }
                return  FBL.findPrevious(elem, iter, false, rootNode);
            },

            getNextByClass: function(elem, className, rootNode)
            {
                function iter(node) { return node.nodeType == 1 && hasClass(node, className); }
                return  FBL.findNext(elem, iter, false, rootNode);
            },

            getPanelA11y : function(panel, create)
            {
                var a11yPanels, panelA11y;
                if (!this.enabled || !panel || !panel.name || !panel.context)
                    return false;
                a11yPanels = panel.context.a11yPanels;
                if (!a11yPanels)
                    a11yPanels = panel.context.a11yPanels = {};
                panelA11y = a11yPanels[panel.name];
                if (!panelA11y)
                {
                    if (create)
                        panelA11y = a11yPanels[panel.name] = {};
                    else
                        return false;
                }
                return panelA11y
            }
        });
        Firebug.registerActivableModule(Firebug.A11yModel);
    }
});