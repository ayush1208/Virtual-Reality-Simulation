import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';
import {OBJLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/loaders/OBJLoader.js';
import {MTLLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/loaders/MTLLoader.js';
import {OrbitControls} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/loaders/GLTFLoader.js';
import {SkeletonUtils} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/utils/SkeletonUtils.js';
import { SceneUtils } from './sceneutils.js';
import * as Plane from './mesh.js';
import * as S_Light from './street_mesh.js';
import * as Stone from './stone_mesh.js';

const main = async() =>{
    const canvas = document.querySelector('#c');

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha :true});

    renderer.shadowMap.enabled = true;

    var plane_flag=0;
    var planes=[];

    var collision_going_on=0,end_point=0;
    var first_rotation=0,first_rev=0;
    var dir=0;
    var end_point_far=[-20.0,0.0,30.0];
    var end_point_near=[-20.0,0.0,-90.0];
    var end_r=10;

    var is_on_plane=0;
    var plane;
    var up=0,down=0;
    var curr_key='no_jump';


    function makeCamera(fov){
        const aspect = 2;  
        const zNear = 0.1;
        const zFar = 1000;
        return new THREE.PerspectiveCamera(fov, aspect, zNear, zFar);
    }

    const camera = makeCamera(45);
    camera.position.set(-20,20,-155);
    camera.lookAt(-20, 10, -50);

    const human_camera=makeCamera(45);

    var curr_cam=camera;

    const scene=new THREE.Scene();

    //Adding a directional light
    const light = new THREE.DirectionalLight('rgb(220,220,220)', 1);
    light.position.set(0, 20, 0);
    scene.add(light);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    const d = 50;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;
    light.shadow.bias = 0.001;

    const light1 = new THREE.DirectionalLight('white', 1);
    light1.position.set(-20, 0, -25);
    scene.add(light1);
    
    //Adding soft white ambient light
    const light_ambient = new THREE.AmbientLight( 0x404040, 2 ); 
    scene.add( light_ambient );

    const manager = new THREE.LoadingManager();
    manager.onLoad=init;

    //Importing and dding the human avatar
    const models= {
        man : {url: 'https://threejsfundamentals.org/threejs/resources/models/knight/KnightCharacter.gltf'},
    };

    {
        const gltfLoader = new GLTFLoader(manager);
        for (const model of Object.values(models)) {
        gltfLoader.load(model.url, (gltf) => {
            model.gltf = gltf;
        });
        }
    }

    function prepModelsAndAnimations() {
        Object.values(models).forEach(model => {
          const animsByName = {};
          model.gltf.animations.forEach((clip) => {
            animsByName[clip.name] = clip;
          });
          model.animations = animsByName;
        });
    }

    const mixers=[];
    var human;

    function init() {
        prepModelsAndAnimations();
    
        Object.values(models).forEach((model, ndx) => {
          const clonedScene = SkeletonUtils.clone(model.gltf.scene);
          const root = new THREE.Object3D();
          root.add(clonedScene);
          scene.add(root);
          human=root;
          root.position.x = -20;
    
          const mixer = new THREE.AnimationMixer(clonedScene);
          const firstClip = Object.values(model.animations)[0];
          const action = mixer.clipAction(firstClip);
          action.play();
          mixers.push(mixer);
        });
      }

      
    const textureLoader=new THREE.TextureLoader();

    //Adding runway
    var runway_texture=textureLoader.load('./runway.jpg');
    const groundGeometry = new THREE.PlaneGeometry(150, 250);
    const groundMaterial = new THREE.MeshPhongMaterial({
        map : runway_texture,
        side : THREE.DoubleSide,
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = Math.PI * -.5;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    let uvMapSpherical = [];
    let uvMapPlanar = [];

    //Adding the building
    var building_texture=textureLoader.load('./windows.png');
    const buildingGeometry= new THREE.BoxGeometry(10,40,40);
    buildingGeometry.uvsNeedUpdate = true;
    const buildingMaterial= new THREE.MeshPhongMaterial({
        map : building_texture,
        side : THREE.DoubleSide,
    });
    const buildingMesh= new THREE.Mesh(buildingGeometry,buildingMaterial);

    //Calculating the planar mapping planar cooridinates
    uv_planar(buildingGeometry);
    //Calculating the spherical mapping planar cooridinates
    uv_spherical(buildingGeometry);

    buildingMesh.rotation.x=Math.PI * -.5;
    buildingMesh.receiveShadow=true;
    buildingMesh.position.x=20;
    buildingMesh.position.y=20;
    scene.add(buildingMesh);

    //Adding street light mesh and the point lights
    var s_light1=await S_Light.mesh();
    s_light1.position.x=-50;
    scene.add(s_light1);
    
    var point_light1=new THREE.PointLight('yellow',5,30);
    point_light1.position.set(-40,20,0);
    scene.add(point_light1);

    var s_light2=await S_Light.mesh();
    s_light2.position.z=-40;
    s_light2.position.x=6;
    s_light2.rotateZ(Math.PI);
    scene.add(s_light2);

    var point_light2=new THREE.PointLight('yellow',5,30);
    point_light2.position.set(-4,20,-40);
    scene.add(point_light2);


    //Adding planes and an object at the front an back of the plane to help in following. 
    var plane1=await Plane.mesh(1);
    plane1.position.x=-20;
    plane1.position.z=-75;
    scene.add(plane1);
    planes.push(plane1);
    const plane1Front = new THREE.Object3D();
    const plane1Back = new THREE.Object3D();
    plane1.add(plane1Front);
    plane1.add(plane1Back);
    plane1Front.position.set(0,0,5);
    plane1Back.position.set(0,0,-5);
    const plane_light=new THREE.PointLight('blue',5,4);
    plane_light['position']['z']+=7;
    plane_light['position']['y']+=3;
    plane1.add(plane_light);

    var plane2=await Plane.mesh(1);
    plane2.position.x=-20;
    plane2.position.z=-90;
    scene.add(plane2);
    planes.push(plane2);
    const plane2Front = new THREE.Object3D();
    const plane2Back = new THREE.Object3D();
    plane2.add(plane2Front);
    plane2.add(plane2Back);
    plane2Front.position.set(0,0,5);
    plane2Back.position.set(0,0,-5);

    var plane3=await Plane.mesh(1);
    plane3.position.x=-20;
    plane3.position.z=-105;
    scene.add(plane3);
    planes.push(plane3);
    const plane3Front = new THREE.Object3D();
    const plane3Back = new THREE.Object3D();
    plane3.add(plane3Front);
    plane3.add(plane3Back);
    plane3Front.position.set(0,0,5);
    plane3Back.position.set(0,0,-5);

    var plane4=await Plane.mesh(1);
    plane4.position.x=-20;
    plane4.position.z=-120;
    scene.add(plane4);
    planes.push(plane4);
    const plane4Front = new THREE.Object3D();
    const plane4Back = new THREE.Object3D();
    plane4.add(plane4Front);
    plane4.add(plane4Back);
    plane4Front.position.set(0,0,5);
    plane4Back.position.set(0,0,-5);

    //Adding obstacles
    var obstacle1=await Stone.mesh();
    obstacle1.position.x=-20;
    obstacle1.position.z=-45;
    obstacle1.rotateY(Math.PI/2);
    scene.add(obstacle1);

    human.position.x=-10;
    human.add(human_camera);
    human_camera.position.y=4;

    //Function for the path to avoid obstacles
    function avoid_obs(centre,r){
        var theta=0;
        if(plane1['position']['x']==centre[0]){
            if(plane1['position']['z']>centre[2]){
                theta=Math.PI/2;
            }
            else{
                theta=-1*Math.PI/2 + 2*Math.PI;
            }
        }
        else{
            theta=Math.atan((plane1['position']['z']-centre[2])/(plane1['position']['x']-centre[0]));
            if(plane1['position']['z']<centre[2]){
                if(theta>0){
                    theta=Math.PI+theta;
                }
                else{
                    theta=2*Math.PI+theta;
                }
            }
            else if(plane1['position']['z']>centre[2]){
                if(theta<0){
                    theta=Math.PI+theta;
                }
            }
        }
        var nextX=centre[0]+r*Math.cos(theta-0.005);
        var nextZ=centre[2]+r*Math.sin(theta-0.005);
        var m=(nextZ-plane1['position']['z'])/(nextX-plane1['position']['x']);
        var lookX;
        if(nextX>plane1['position']['x']){
            lookX=nextX+20;
        }
        else{
            lookX=nextX-20;
        }
        var lookZ=m*(lookX-nextX)+nextZ;
        plane1.position.set(nextX,0,nextZ);
        plane1.lookAt(lookX,0,lookZ);  
    }

    function rotate(){
        plane1.rotateY(-0.01);
    }

    //Function to check if the object is colliding with the obstacle
    function isCollide(){
        var centre=[obstacle1.position.x,0,obstacle1.position.z];
        if(Math.abs(plane1['position']['z']-centre[2])<=12){
            return centre;
        }
        return 0;
    }

    //Function to make an object (follower) follow the leader
    function follow(leader, leaderBack, follower, followerFront){
        const leaderPos = new THREE.Vector3();
        const followerPos = new THREE.Vector3();
        const diff = new THREE.Vector3();

        leaderBack.getWorldPosition(leaderPos);
        followerFront.getWorldPosition(followerPos);
        leaderPos.sub(followerPos); //This is the vector that the follower 
        
        if(leaderPos.lengthSq()>5){
            leaderPos.normalize();

          follower.position.set(follower.position.x + 0.1*leaderPos.x, follower.position.y + 0.1*leaderPos.y, follower.position.z + 0.1*leaderPos.z);
          
          leaderBack.getWorldPosition(diff);
          follower.lookAt(diff);
        }
    }

    function moveFront(obj){
        const forw = new THREE.Vector3();
        obj.getWorldDirection(forw);
        forw.normalize();
        obj.position.set(obj.position.x + 0.08*forw.x, obj.position.y, obj.position.z + 0.08*forw.z );
        obj.lookAt(obj.position.x + 0.08*forw.x, obj.position.y, obj.position.z + 0.08*forw.z);
       
    }

    //Function to define path to move if escaping object
    function escaping_object1(centre,r){

        if(plane1['rotation']['_y']>=-1.55 && first_rotation==0){
            rotate();
            plane1.position.set(centre[0],0,centre[2]-r);
        }
        else{
            first_rotation=1;
            if(plane1['position']['x']<=centre[0] && first_rev==0){
                avoid_obs(centre,r);
            }
            else{
                first_rev=1;
                plane1.position.set(centre[0],0,centre[2]+r);
                if(plane1['rotation']['_y']>=0){
                    rotate();
                }
                else{
                    plane1['rotation']['_y']=0;
                    plane1.position.set(centre[0],0,centre[2]+r+0.01);
                    collision_going_on=0;
                    first_rotation=0;
                    first_rev=0;
                }
            }
        }
    }

    function escaping_object2(centre,r){
        if(plane1['rotation']['_y']<=1.55 && first_rotation==0){
            rotate();
            plane1.position.set(centre[0],0,centre[2]+r);
        }
        else{
            first_rotation=1;
            if(plane1['position']['x']>=centre[0] && first_rev==0){
                avoid_obs(centre,r);
            }
            else{
                first_rev=1;
                plane1.position.set(centre[0],0,centre[2]-r);
                if(plane1['rotation']['_y']<=0){
                    rotate();
                }
                else{
                    plane1['rotation']['_y']=0;
                    plane1.position.set(centre[0],0,centre[2]-(r+0.01));
                    collision_going_on=0;
                    first_rotation=0;
                    first_rev=0;
                }
            }
        }
    }

    //Function to take a uturn at the end of the path
    function uturn1(){
        if(plane1['rotation']['_y']>=-1.55 && first_rotation==0){
            rotate();
            plane1.position.set(end_point_far[0],0,end_point_far[2]+0.002);
        }
        else{
            first_rotation=1;
            if(plane1['position']['z']>=end_point_far[2]+0.0001 && first_rev==0){
                avoid_obs([end_point_far[0],0.0,end_point_far[2]+end_r],end_r);
            }
            else{
                first_rev=1;
                plane1.position.set(end_point_far[0],0,end_point_far[2]-0.001);
                if(plane1['rotation']['_y']<0){
                    rotate();
                }
                else{
                    plane1.position.set(end_point_far[0],0,end_point_far[2]-0.001);
                    end_point=0;
                    first_rotation=0;
                    first_rev=0;
                }
            }
        }
    }

    //Function to take a uturn at the other end of the path
    function uturn2(){
        if(plane1['rotation']['_y']<=1.55 && first_rotation==0){
            rotate();
            plane1.position.set(end_point_near[0],0,end_point_near[2]-0.002);
        }
        else{
            first_rotation=1;
            if(plane1['position']['z']<=end_point_near[2]-0.0001 && first_rev==0){
                avoid_obs([end_point_near[0],0.0,end_point_near[2]-end_r],end_r);
            }
            else{
                first_rev=1;
                plane1.position.set(end_point_near[0],0,end_point_near[2]+0.001);
                if(plane1['rotation']['_y']>0){
                    rotate();
                }
                else{
                    plane1.position.set(end_point_near[0],0,end_point_near[2]+0.001);
                    end_point=0;
                    first_rotation=0;
                    first_rev=0;
                }
            }
        }
    }


    function isjumpable(){
        var model;
        var dist=10000000;

        for (let i=0;i<planes.length;i++){
            var md=planes[i];
            var dis=Math.sqrt((md.position.x-human.position.x)*(md.position.x-human.position.x) + (md.position.z-human.position.z)*(md.position.z-human.position.z));
            if(dis<dist){
                dist=dis;
                model=md;
            }
        }
        if(dist<=8){
            return model;
        }
        return 0;
    }
    
    //Function to make the avatar jump
    function jump(){
        if(human.position.y<=5 && up==0){
            human.position.y+=0.5;
        }
        else{
            up=1;
            human.position.y=0;
            if(human.position.y>0 && down==0){
                human.position.y-=0.5;
            }
            else
            {
                human.position.y=0;
                up=0;
                down=0;
                curr_key='no_jump';
            }
        }
    }


    //Function that sets the uv attribute to the planar mapping
    function uv_planar(geometry){
        geometry.computeBoundingBox();
  
        var max = geometry.boundingBox.max;
        var min = geometry.boundingBox.min;
      
        var offset = new THREE.Vector3(0 - min.x, 0 - min.y, 0-min.z);
        var range = new THREE.Vector3(max.x - min.x, max.y - min.y, max.z - min.z);
        var positions = Array.from(geometry.attributes.position.array);
        var uvAttribute = geometry.attributes.uv;

        for (var i = 0; i < positions.length / 3; i++) {
            var x = positions[i * 3];
            var y = positions[i * 3 + 1];
            var z = positions[i * 3 + 2];
            x = (x+offset.x)/range.x;
            y = (y+offset.y)/range.y;
            z = (z+offset.z)/range.z;
            var U = uvAttribute.getX( i );
            var V = uvAttribute.getY( i );
            
            U = z;
            V = y;

            let uvcoord = new THREE.Vector2(U,V);
            uvMapPlanar.push(uvcoord);
        }
    }

    //Function that sets the uv attribute to the spherical mapping
    function uv_spherical(geometry){
        geometry.computeBoundingBox();
    
        var max = geometry.boundingBox.max;
        var min = geometry.boundingBox.min;
        
        var offset = new THREE.Vector3(0 - min.x, 0 - min.y, 0-min.z);
        var range = new THREE.Vector3(max.x - min.x, max.y - min.y, max.z - min.z);
        var positions = Array.from(geometry.attributes.position.array);
        var uvAttribute = geometry.attributes.uv;

            for (var i = 0; i < positions.length / 3; i++) {
                
            var x = positions[i * 3];
            var y = positions[i * 3 + 1];
            var z = positions[i * 3 + 2];
            x = (x)/Math.abs(range.x);
            y = (y)/Math.abs(range.y);
            z = (z)/Math.abs(range.z);
            var U = uvAttribute.getX( i );
            var V = uvAttribute.getY( i );

            U =  (Math.atan2(y, x) / Math.PI*0.5)+0.5 ;
            V = 0.5 - (Math.asin(z) / Math.PI);
            
            let uvcoord = new THREE.Vector2(U,V);
            uvMapSpherical.push(uvcoord);
        }
    }

    //Function to set the map to planar or spherical according to the input
    function set_mapping(geometry, mapping){
        var positions = Array.from(geometry.attributes.position.array);
        var uvAttribute = geometry.attributes.uv;
        let uvMap;

        if(mapping==1){
            uvMap = uvMapPlanar;
        }
        else{
            uvMap = uvMapSpherical;
        }

        for (var i = 0; i < positions.length / 3; i++) {
            uvAttribute.setXY( i, uvMap[i].x, uvMap[i].y );
        }

        geometry.uvsNeedUpdate = true;
        uvAttribute.needsUpdate = true;
        buildingMesh.material.needsUpdate = true;
    }


    window.addEventListener("keydown",(event) => {
        switch(event.key){
            case "t":
                var plane_texture;
                if(plane_flag==0){
                    plane_texture=textureLoader.load('./jet_texture2.jpg');
                }
                else{
                    plane_texture=textureLoader.load('./jet_texture1.jpeg');
                }
                plane_texture.wrapS = THREE.RepeatWrapping;
                plane_texture.wrapT = THREE.RepeatWrapping;
                plane_texture.magFilter = THREE.NearestFilter;
                const repeats=20;
                plane_texture.repeat.set(repeats, repeats); 
                const material = new THREE.MeshPhongMaterial({map: plane_texture});
                for(let i=0;i<planes.length;i++){
                    var pl=planes[i];
                    pl.traverse(function(node){
                        if(node.isMesh){
                            node.material=material;
                        }
                    })
                }
                plane_flag=plane_flag^1;
                break;
                
                case "ArrowDown":
                    if(is_on_plane==0){
                        if(human.getWorldDirection()['x']==1){
                            human.position.x=human.position.x+0.5;
                            human.lookAt(150,0,human.position.z);
                        }
                        else if(human.getWorldDirection()['z']==1){
                            human.position.z=human.position.z+0.5;
                            human.lookAt(human.position.x,0,150);
                        }
                        else if(human.getWorldDirection()['x']==-1){
                            human.position.x=human.position.x-0.5;
                            human.lookAt(-150,0,human.position.z);
                        }
                        else if(human.getWorldDirection()['z']==-1){
                            human.position.z=human.position.z-0.5;
                            human.lookAt(human.position.x,0,-150);
                        }
                    }
                    else{
                        human.rotateY(0.2);
                    }
                    break;

                case "ArrowRight":
                    if(is_on_plane==0){
                        if(human.getWorldDirection()['x']==1){
                            human.lookAt(human.position.x,0,150);
                        }
                        else if(human.getWorldDirection()['z']==1){
                            human.lookAt(-150,0,human.position.z);
                        }
                        else if(human.getWorldDirection()['x']==-1){
                            human.lookAt(human.position.x,0,-150);
                        }
                        else if(human.getWorldDirection()['z']==-1){
                            human.lookAt(150,0,human.position.z);
                        }
                    }
                    else{
                        human.rotateY(0.2);
                    }
                    break;

                case "ArrowLeft":
                    if(is_on_plane==0){
                        if(human.getWorldDirection()['x']==1){
                            human.lookAt(human.position.x,0,-150);
                        }
                        else if(human.getWorldDirection()['z']==1){
                            human.lookAt(150,0,human.position.z);
                        }
                        else if(human.getWorldDirection()['x']==-1){
                            human.lookAt(human.position.x,0,150);
                        }
                        else if(human.getWorldDirection()['z']==-1){
                            human.lookAt(-150,0,human.position.z);
                        }
                    }
                    else{
                        human.rotateY(-0.2);
                    }
                    break;

                case "ArrowUp":
                    if(is_on_plane==0){
                        if(human.getWorldDirection()['x']==1){
                            human.position.x=human.position.x-0.5;
                            human.lookAt(150,0,human.position.z);
                        }
                        else if(human.getWorldDirection()['z']==1){
                            human.position.z=human.position.z-0.5;
                            human.lookAt(human.position.x,0,150);
                        }
                        else if(human.getWorldDirection()['x']==-1){
                            human.position.x=human.position.x+0.5;
                            human.lookAt(-150,0,human.position.z);
                        }
                        else if(human.getWorldDirection()['z']==-1){
                            human.position.z=human.position.z+0.5;
                            human.lookAt(human.position.x,0,-150);
                        }
                    }
                    else{
                        human.rotateY(-0.2);
                    }
                    break;

                case "k":
                    if(point_light1.visible==true){
                        point_light1.visible=false;
                    }
                    else{
                        point_light1.visible=true;
                    }
                    break;
                
                case "l":
                    if(point_light2.visible==true){
                        point_light2.visible=false;
                    }
                    else{
                        point_light2.visible=true;
                    }
                    break;
                
                case "s":
                    if(is_on_plane==1){
                        SceneUtils.detach(human,plane,scene);
                        human.position.x=plane.position.x+4;
                        human.position.z=plane.position.z;
                        human.lookAt(human.position.x,0,150);
                        is_on_plane=0;
                    }
                    else{
                        plane=isjumpable();
                        if(plane!=0){
                            human.position.x=plane.position.x;
                            human.position.z=plane.position.z;
                            SceneUtils.attach(human,scene,plane);
                            is_on_plane=1;
                        }
                    }
                    break;
                
                case "z":
                    curr_key='yes_jump';
                    break;

                case "c":
                    if(curr_cam==camera){
                        curr_cam=human_camera;
                    }
                    else{
                        curr_cam=camera;
                    }
                    break;

                case "a":
                    set_mapping(buildingGeometry, 0);
                    break;
                case "b":
                    set_mapping(buildingGeometry, 1);
                    break;

        }   
    });


    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
          renderer.setSize(width, height, false);
        }
        return needResize;
    }


    
    let prev=0;

    const controls = new OrbitControls(camera, canvas);
    controls.enableKeys = false;
    controls.target.set(-10, 0, -30);
    controls.update();


    function render(time){
        time*=0.001;
        const deltaTime=time-prev;
        prev=time;
        
        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            curr_cam.aspect = canvas.clientWidth / canvas.clientHeight;
            curr_cam.updateProjectionMatrix();
        }


        var centre;
        var r=12;

        if(isCollide()!=0){
            centre=isCollide();
            if(plane1['position']['z']<centre[2] && collision_going_on==0){
                dir=0;
            }
            else if(plane1['position']['z']>centre[2] && collision_going_on==0){
                dir=1;
            }
            collision_going_on=1;
        }
        if(plane1['position']['z']>=end_point_far[2]){
            dir=0;
            end_point=1;
        }
        var ford=new THREE.Vector3();
        if(plane1['position']['z']<=end_point_near[2] && plane1.getWorldDirection(ford)['z']<0){
            dir=1;
            end_point=1;
        }
        if(collision_going_on==0 && end_point==0){
            moveFront(plane1);
        }
        else{
            if(collision_going_on==1){
                if(dir==0){
                    escaping_object1(centre,r);
                }
                else{
                    escaping_object2(centre,r);
                }
            }
            else
            {   
                if(dir==0){
                    uturn1();
                }
                else{
                    uturn2();
                }
                
            }
        }
        

        if(curr_key=='yes_jump'){
            jump();
        }
        
        follow(plane1, plane1Back, plane2, plane2Front);
        follow(plane2, plane2Back, plane3, plane3Front);
        follow(plane3, plane3Back, plane4, plane4Front);
        
        renderer.render(scene, curr_cam);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

};
main();