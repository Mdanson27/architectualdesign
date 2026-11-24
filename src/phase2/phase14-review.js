import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local QA only');
const url=p=>import.meta.env.BASE_URL+p.replace(/^\//,'');
const manifest=await (await fetch(url('/furniture/manifest.json'))).json();
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(480,400);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const loader=new GLTFLoader();
window.__FurnitureQA={ids:manifest.assets.map(a=>a.id),async render(id,detail='high',back=false){
 const asset=manifest.assets.find(a=>a.id===id),model=(await loader.loadAsync(url(asset.variants[detail].path))).scene;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xece7df);scene.add(model);
 scene.add(new THREE.HemisphereLight(0xfff8ed,0x7c746c,2.0));const key=new THREE.DirectionalLight(0xffefdf,2.8);key.position.set(-3,5,-4);scene.add(key);const fill=new THREE.DirectionalLight(0xffffff,1.1);fill.position.set(3,2,3);scene.add(fill);
 const b=new THREE.Box3().setFromObject(model,true),size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3()),r=Math.max(...size.toArray())*.76;
 const cam=new THREE.OrthographicCamera(-r*1.2,r*1.2,r,-r,.01,100);cam.position.copy(c).add(new THREE.Vector3(1.6,1.1,back?2.4:-2.4).normalize().multiplyScalar(r*5));cam.lookAt(c);cam.updateProjectionMatrix();
 try{renderer.render(scene,cam);const canvas=document.createElement('canvas');canvas.width=480;canvas.height=400;const ctx=canvas.getContext('2d');ctx.drawImage(renderer.domElement,0,0);const p=ctx.getImageData(0,0,480,400).data;let different=0;for(let i=0;i<p.length;i+=4){if(Math.abs(p[i]-p[0])+Math.abs(p[i+1]-p[1])+Math.abs(p[i+2]-p[2])>15)different++;}return {id,detail,back,triangles:renderer.info.render.triangles,foregroundPixels:different,png:canvas.toDataURL('image/png')};}
 finally{const materials=new Set(),textures=new Set();model.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map)textures.add(m.map);}}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());}
}};
