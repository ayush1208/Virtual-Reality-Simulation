import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';
import {OBJLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/loaders/OBJLoader.js';
import {loading} from './model.js';
import {textset} from './model.js'
export const mesh=async (x) => {
    const z=await textset(x);
    const mesh=await loading();
    return mesh;
};
