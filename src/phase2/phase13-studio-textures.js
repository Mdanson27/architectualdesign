export const STUDIO_TEXTURE_NAMES=Object.freeze(['plaster','marble','wood','ash','caramel','stone']);
export function drawStudioTexture(type){
 const c=document.createElement('canvas');c.width=c.height=512;
 const p=c.getContext('2d');p.clearRect(0,0,512,512);
 if(type==='marble'){
  p.fillStyle='#e9e3db';p.fillRect(0,0,512,512);
  for(let i=0;i<29;i++){
   let x=(i*127)%600-60, y=(i*81)%640-75;
   p.strokeStyle=(i%4?'rgba(133,115,97,.18)':'rgba(201,163,120,.40)');
   p.lineWidth=i%6?1.2:2.7;
   p.beginPath();p.moveTo(x-65,y-95);p.bezierCurveTo(x+55,y+30,x-50,y+150,x+65,y+230);p.stroke();
  }
 } else if(type==='wood'){
  p.fillStyle='#ab876b';p.fillRect(0,0,512,512);
  for(let x=0;x<512;x+=38){
   p.fillStyle=['#c29b75','#a87c60','#bb9472','#a47d5e'][(x/38)%4|0];
   p.fillRect(x+1,0,36,512);
   p.fillStyle='#694b39';p.fillRect(x+37,0,1.2,512);
   for(let t=0;t<4;t++){
    p.strokeStyle='rgba(80,52,37,.16)';p.lineWidth=.75;p.beginPath();
    p.moveTo(x+t*8,0);p.bezierCurveTo(x+7+t*8,145,x-2+t*8,320,x+t*8,512);p.stroke();
   }
  }
 }else if(type==='ash'||type==='caramel'){
   // Wood-look floor tiles from Studio Anne page 7: samples, not timber planks.
   const ash=type==='ash';
   const shades=ash?['#e3d9c9','#d5caba','#ebe1d1','#cec3b3']:
    ['#cb9b73','#bd8b61','#d6a87f','#b5825c'];
   p.fillStyle=shades[0];p.fillRect(0,0,512,512);
   for(let x=0;x<512;x+=64){
    p.fillStyle=shades[(x/64)%4];p.fillRect(x+1,0,62,512);
    p.fillStyle=ash?'rgba(97,80,64,.19)':'rgba(84,50,30,.19)';
    p.fillRect(x+62,0,2,512);
    for(let line=0;line<5;line++){
     const offset=(line*11+x*7)%55;
     p.strokeStyle=ash?'rgba(119,104,87,.13)':'rgba(79,51,29,.15)';
     p.lineWidth=.8;p.beginPath();p.moveTo(x+offset,0);
     p.bezierCurveTo(x+offset+5,145,x+offset-4,320,x+offset+2,512);
     p.stroke();
    }
   }
 }else if(type==='stone'){
  p.fillStyle='#e6dccb';p.fillRect(0,0,512,512);
  for(let row=0;row<24;row++)for(let col=0;col<10;col++){
   let x=col*56-(row%2)*28,y=row*22;
   p.fillStyle=['#e6dfd4','#cbc4b7','#f1ebde','#d7d0c6'][(col+3*row)%4];
   p.fillRect(x+1,y+1,54,20);
  }
 }else{
  p.fillStyle='#eee7db';p.fillRect(0,0,512,512);
  for(let i=0;i<4500;i++){
   const a=(i*87)%512,b=(i*193)%512;
   p.fillStyle=i%2?'rgba(120,104,81,.020)':'rgba(255,255,255,.035)';
   p.fillRect(a,b,2,2);
  }
 }
 return c;
}
