// ==UserScript==
// @name         Aero Menu
// @namespace    http://tampermonkey.net/
// @version      7.2
// @updateURL    https://raw.githubusercontent.com/gitty-rubber/Aero-Kirka.io-Menu/main/AeroMenu.user.js
// @downloadURL  https://raw.githubusercontent.com/gitty-rubber/Aero-Kirka.io-Menu/main/AeroMenu.user.js
// @description  Fully customizable menu - colors, opacity, size + Chams/No Recoil/Bhop
// @author       muci00
// @match        https://kirka.io/*
// @icon         https://www.google.com/s2/favicons?domain=kirka.io&sz=64
// @grant        none
// @run-at       document-start
// ==/UserScript==
(function() {
    'use strict';
    // License bypass
    if (crypto && crypto.subtle && crypto.subtle.verify) crypto.subtle.verify = () => Promise.resolve(true);
    if (localStorage) localStorage.dogewareLicenseKey = btoa(`{"message":"${Date.now() * 2}"}`);
    let menuVisible = false;
    let chamsEnabled = false;
    let noRecoilEnabled = false;
    let bhopEnabled = false;
    let scene = null;
    let camera = null;
    let localTeam = null;
    let modifiedMaterials = new WeakSet();
    let isShooting = false;
    let spaceHeld = false;
    let THREE = null;
    const settings = {
        menuBg: 'rgba(20, 10, 30, 0.95)',
        menuBorder: '#9d00ff',
        menuGlow: '#6a00b3',
        headerColor: '#c300ff',
        textColor: '#e0e0e0',
        labelColor: '#e0e0e0',
        buttonBg: '#6a00b3',
        opacity: 0.95,
        width: 300,
        fontSize: 16
    };
    document.addEventListener('mousedown', (e) => { if (e.button === 0) isShooting = true; });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) isShooting = false; });
    document.addEventListener('keydown', (e) => { if (e.code === 'Space') spaceHeld = true; }, true);
    document.addEventListener('keyup', (e) => { if (e.code === 'Space') spaceHeld = false; }, true);
    const origSet = WeakMap.prototype.set;
    WeakMap.prototype.set = function(key, value) {
        if (value && value.type === 'Scene' && value.autoUpdate === false) {
            scene = value;
            THREE = window.THREE;
            console.log('Scene & THREE hooked');
        } else if (value && value.type === 'PerspectiveCamera') {
            camera = value;
            console.log('Camera hooked');
        }
        return origSet.call(this, key, value);
    };
    const patchMaterial = (material) => {
        if (!material || !material.map || !material.map.image || material.map.image.width !== 64 || material.map.image.height !== 64) return;
        if (chamsEnabled && !modifiedMaterials.has(material)) {
            for (let key in material) {
                if (material[key] === 3) {
                    material[key] = 1;
                    modifiedMaterials.add(material);
                    break;
                }
            }
        } else if (!chamsEnabled && modifiedMaterials.has(material)) {
            for (let key in material) {
                if (material[key] === 1) {
                    material[key] = 3;
                    break;
                }
            }
            modifiedMaterials.delete(material);
        }
    };
    const proxyHandler = { apply(target, thisArg, args) { patchMaterial(args[0]); return Reflect.apply(target, thisArg, args); } };
    Array.isArray = new Proxy(Array.isArray, proxyHandler);
    function updateLocalTeam() {
        if (!scene || !camera) return;
        let minDist = Infinity;
        let closestTeam = null;
        scene.children.filter(p => p.type === 'Group' && p.entity?.colyseusObject?.team).forEach(p => {
            const dist = camera.position.distanceTo(p.position);
            if (dist < minDist && dist > 2) {
                minDist = dist;
                closestTeam = p.entity.colyseusObject.team;
            }
        });
        if (minDist < 5) localTeam = closestTeam;
    }
    const origRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(cb) {
        return origRAF.call(this, (time) => {
            if (chamsEnabled && scene && camera && THREE) {
                scene.children
                    .filter(p => p.type === 'Group' && p.entity?.colyseusObject?.team && camera.position.distanceTo(p.position) < 300 && camera.position.distanceTo(p.position) > 3)
                    .forEach(player => {
                        const character = player.children[0]?.children[0]?.children[1];
                        if (!character?.material) return;
                        const mat = character.material;
                        const isTeammate = player.entity.colyseusObject.team === localTeam;
                        mat.depthTest = false;
                        mat.fog = false;
                        mat.alphaTest = 1;
                        mat.needsUpdate = true;
                        let color;
                        if (isTeammate) {
                            color = new THREE.Color(0, 0, 1); // Blue team
                        } else {
                            const playerPos = player.position.clone();
                            const dir = playerPos.sub(camera.position).normalize();
                            const raycaster = new THREE.Raycaster(camera.position, dir, 0, playerPos.distanceTo(camera.position));
                            const intersects = raycaster.intersectObjects(scene.children, true);
                            const occluded = intersects.length > 0 && intersects[0].distance < playerPos.distanceTo(camera.position) - 0.5;
                            color = occluded ? new THREE.Color(1, 0, 0) : new THREE.Color(0, 1, 0);
                        }
                        mat.color.set(color);
                        if (mat.emissive) {
                            mat.emissive.set(color);
                            mat.emissiveIntensity = 0.8;
                        }
                    });
                if (noRecoilEnabled && isShooting && document.pointerLockElement) {
                    const lerp = (a, b, t) => a + (b - a) * t;
                    camera.rotation.x = lerp(camera.rotation.x, 0, 0.25);
                    camera.rotation.y *= 0.92;
                }
            }
            cb(time);
        });
    };
    setInterval(updateLocalTeam, 2000);
    setTimeout(updateLocalTeam, 3000);
    window.addEventListener('DOMContentLoaded', () => {
        const menu = document.createElement('div');
        menu.id = 'cheatMenu';
        menu.style.cssText = `
            position: fixed; top: 50px; left: 50px;
            width: ${settings.width}px; padding: 15px;
            background: ${settings.menuBg};
            color: ${settings.textColor};
            z-index: 999999; border: 2px solid ${settings.menuBorder}; border-radius: 10px;
            font-family: Arial; font-size: ${settings.fontSize}px;
            user-select: none; display: none;
            box-shadow: 0 0 25px ${settings.menuGlow};
        `;
        menu.innerHTML = `
            <div id="menuHeader" style="cursor: move; font-weight: bold; margin-bottom: 15px; font-size: 22px; color: ${settings.headerColor};">Aero</div>
            <div style="margin-bottom: 10px; color: ${settings.labelColor};">Features</div>
            <label style="display: block; margin: 8px 0; cursor: pointer;"><input type="checkbox" id="chamsCB"> Chams ESP (G/R/B)</label>
            <label style="display: block; margin: 8px 0; cursor: pointer;"><input type="checkbox" id="recoilCB"> No Recoil</label>
            <label style="display: block; margin: 8px 0; cursor: pointer;"><input type="checkbox" id="bhopCB"> Bhop (Hold Space)</label>
            <div style="margin: 20px 0 10px; color: ${settings.labelColor};">Customization</div>
            <label style="display: block; margin: 6px 0;">Background Opacity: <input type="range" id="opacitySlider" min="0.3" max="1" step="0.05" value="${settings.opacity}"></label>
            <label style="display: block; margin: 6px 0;">Menu Width: <input type="range" id="widthSlider" min="250" max="450" step="10" value="${settings.width}"></label>
            <label style="display: block; margin: 6px 0;">Font Size: <input type="range" id="fontSlider" min="12" max="20" step="1" value="${settings.fontSize}"></label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                <input type="color" id="bgColor" value="#140a1e" title="Background Color">
                <input type="color" id="borderColor" value="#9d00ff" title="Border Color">
                <input type="color" id="glowColor" value="#6a00b3" title="Glow Color">
                <input type="color" id="headerColor" value="#c300ff" title="Header Color">
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <a href="https://discord.gg/dw8JH9cVz5" target="_blank" style="color: #7289da; font-weight: bold; text-decoration: underline; font-size: 14px;">Join the discord for more free scripts!</a>
            </div>
            <button id="closeBtn" style="width: 100%; background: ${settings.buttonBg}; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; margin-top: 20px;">Close</button>
            <div style="font-size: 12px; margin-top: 10px; color: #a0a0a0; text-align: center;">P to toggle | Drag header to move</div>
        `;
        document.body.appendChild(menu);
        let dragging = false, ox, oy;
        const header = document.getElementById('menuHeader');
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            dragging = true;
            ox = e.clientX - menu.offsetLeft;
            oy = e.clientY - menu.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (dragging) {
                menu.style.left = (e.clientX - ox) + 'px';
                menu.style.top = (e.clientY - oy) + 'px';
            }
        });
        document.addEventListener('mouseup', () => dragging = false);
        document.getElementById('chamsCB').addEventListener('change', (e) => { chamsEnabled = e.target.checked; if (chamsEnabled) updateLocalTeam(); });
        document.getElementById('recoilCB').addEventListener('change', (e) => noRecoilEnabled = e.target.checked);
        document.getElementById('bhopCB').addEventListener('change', (e) => bhopEnabled = e.target.checked);
        const updateMenuStyle = () => {
            const rgba = document.getElementById('bgColor').value.replace('#', '');
            const r = parseInt(rgba.substr(0,2),16);
            const g = parseInt(rgba.substr(2,2),16);
            const b = parseInt(rgba.substr(4,2),16);
            menu.style.background = `rgba(${r},${g},${b},${document.getElementById('opacitySlider').value})`;
            menu.style.borderColor = document.getElementById('borderColor').value;
            menu.style.boxShadow = `0 0 25px ${document.getElementById('glowColor').value}`;
            document.getElementById('menuHeader').style.color = document.getElementById('headerColor').value;
            menu.style.width = document.getElementById('widthSlider').value + 'px';
            menu.style.fontSize = document.getElementById('fontSlider').value + 'px';
        };
        ['bgColor','borderColor','glowColor','headerColor','opacitySlider','widthSlider','fontSlider'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateMenuStyle);
        });
        document.getElementById('closeBtn').onclick = () => {
            menu.style.display = 'none';
            menuVisible = false;
        };
        setInterval(() => {
            if (bhopEnabled && spaceHeld && document.pointerLockElement && document.hasFocus()) {
                const down = new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true, cancelable: true });
                document.dispatchEvent(down);
                setTimeout(() => {
                    const up = new KeyboardEvent('keyup', { key: ' ', code: 'Space', keyCode: 32, bubbles: true, cancelable: true });
                    document.dispatchEvent(up);
                }, 5);
            }
        }, 35);
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'p') {
                e.preventDefault();
                e.stopPropagation();
                menuVisible = !menuVisible;
                menu.style.display = menuVisible ? 'block' : 'none';
            }
        }, true);
    });
    console.log('Aero v7.1 loaded - fully customizable menu. Press P, tweak colors/opacity/size live. Dominate.');
})();
