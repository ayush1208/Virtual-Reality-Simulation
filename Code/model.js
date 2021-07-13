import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';
import {OBJLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/loaders/OBJLoader.js';

const textureLoader=new THREE.TextureLoader();
var texture;
export const textset = (x) =>{
    return new Promise((resolve) => {
        if(x==2){
            texture=textureLoader.load('./jet_texture2.jpg'); 
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.magFilter = THREE.NearestFilter;
            const repeats=20;
            texture.repeat.set(repeats, repeats);
        }
        else{
            texture=textureLoader.load('./jet_texture1.jpeg'); 
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.magFilter = THREE.NearestFilter;
            const repeats=20;
            texture.repeat.set(repeats, repeats);
        }
        resolve(1);
    });
};



export const loading = () => {
    const material = new THREE.MeshPhongMaterial({map: texture});
    return new Promise ((resolve) => {
        const objLoader=new OBJLoader();
        objLoader.load('./Plane.obj',(root) => {
            root.traverse(function(node){
                if(node.isMesh){
                    node.material=material;
                }
            })
            resolve(root);
        });
    });
};

