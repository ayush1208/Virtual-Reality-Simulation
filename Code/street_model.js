import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';
import {OBJLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/loaders/OBJLoader.js';

const textureLoader=new THREE.TextureLoader();
var texture=textureLoader.load('./street_light_texture.jpeg'); 
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.magFilter = THREE.NearestFilter;
const repeats=20;
texture.repeat.set(repeats, repeats);



export const loading = () => {
    const material = new THREE.MeshPhongMaterial({map: texture});
    return new Promise ((resolve) => {
        const objLoader=new OBJLoader();
        objLoader.load('./street_light.obj',(root) => {
            root.traverse(function(node){
                if(node.isMesh){
                    node.material=material;
                }
            })
            root.rotation.x=Math.PI * -.5;
            root.receiveShadow=true;
            resolve(root);
        });
    });
};

