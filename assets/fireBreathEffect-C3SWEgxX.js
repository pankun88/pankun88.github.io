import{A as e,D as t,I as n,J as r,T as i,W as a,b as o,j as s,l as c,rt as l,w as u}from"./locomotion-C6yITJmv.js";var d={Flame:0,Smoke:1,Plasma:2,Spark:3,Glow:4},f=`
  attribute vec3 iPosition;
  attribute vec3 iVelocity;
  attribute vec4 iData; // age 0..1, world size, seed, strength
  uniform float uStretch;
  varying vec2 vUv;
  varying vec4 vData;
  varying float vStretch;
  void main() {
    vUv = position.xy;
    vData = iData;
    vec4 view = modelViewMatrix * vec4(iPosition, 1.0);
    vec2 flow = (modelViewMatrix * vec4(iVelocity, 0.0)).xy;
    float speed = length(flow);
    float angle = iData.z * 6.2831853 + iData.x * (iData.z - 0.5) * 2.0;
    vec2 along = speed > 1e-4 && uStretch > 0.0
      ? flow / speed
      : vec2(cos(angle), sin(angle));
    vec2 across = vec2(-along.y, along.x);
    vStretch = 1.0 + uStretch * speed;
    view.xy += (along * position.x * vStretch + across * position.y) * iData.y;
    gl_Position = projectionMatrix * view;
  }
`,p=`
  #define LOOK __LOOK__
  uniform float uTime;
  uniform vec3 uTint;
  varying vec2 vUv;
  varying vec4 vData;
  varying float vStretch;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += amp * noise(p);
      p = p * 2.03 + vec2(1.7, -2.3);
      amp *= 0.5;
    }
    return sum;
  }
  vec3 fireRamp(float heat) {
    vec3 color = mix(vec3(0.32, 0.035, 0.01), vec3(0.95, 0.24, 0.02), smoothstep(0.0, 0.35, heat));
    color = mix(color, vec3(1.0, 0.56, 0.1), smoothstep(0.3, 0.65, heat));
    return mix(color, vec3(1.0, 0.86, 0.5), smoothstep(0.72, 1.0, heat));
  }
  vec3 plasmaRamp(float heat) {
    vec3 color = mix(vec3(0.16, 0.06, 0.42), vec3(0.5, 0.26, 1.0), smoothstep(0.0, 0.45, heat));
    color = mix(color, vec3(0.78, 0.66, 1.0), smoothstep(0.45, 0.8, heat));
    return mix(color, vec3(0.97, 0.95, 1.0), smoothstep(0.8, 1.0, heat));
  }

  void main() {
    float age = vData.x;
    float seed = vData.z;
    float strength = vData.w;
    float radius = length(vUv);
    if (radius > 1.0) discard;
    vec3 rgb;
    float alpha;
    // 1 = occludes like matter, 0 = adds light only.
    float cover;
  #if LOOK == 0 || LOOK == 2
    // Billowing tongue: noise erodes the soft disc more as the puff cools.
    vec2 drift = vec2(seed * 19.0, seed * 37.0) + vec2(0.0, -uTime * 2.2);
    float n = fbm(vUv * 2.1 + drift);
    float density = (1.0 - radius * radius) * (0.4 + 1.2 * n);
    float threshold = 0.18 + age * 0.6;
    #if LOOK == 0
      alpha = smoothstep(threshold, threshold + 0.26 + age * 0.2, density) * strength;
      float heat = clamp((1.0 - age * 1.35) * (0.5 + 0.6 * density), 0.0, 1.0);
      rgb = fireRamp(heat) * (0.85 + 0.75 * heat * heat);
      cover = mix(0.92, 0.35, heat);
    #else
      // Plasma stays smooth and fades rather than breaking into flakes.
      float soft = pow(1.0 - radius * radius, 1.5) * (0.5 + 0.9 * n);
      alpha = min(1.0, soft * soft * 1.6) * pow(1.0 - age, 1.5) * strength;
      float heat = clamp((1.0 - age * 1.7) * (0.6 + 0.5 * soft), 0.0, 1.0);
      rgb = plasmaRamp(heat) * (0.9 + 0.8 * heat * heat);
      cover = mix(0.7, 0.25, heat);
    #endif
  #elif LOOK == 1
    vec2 drift = vec2(seed * 23.0, seed * 11.0) + vec2(uTime * 0.18, -uTime * 0.35);
    float n = fbm(vUv * 1.3 + drift);
    float density = (1.0 - radius * radius) * (0.35 + 0.95 * n);
    alpha = smoothstep(0.18, 0.75, density) * smoothstep(0.0, 0.18, age) * (1.0 - age) * 0.3 * strength;
    rgb = mix(uTint * 0.85, uTint * 1.05, age);
    cover = 1.0;
  #elif LOOK == 3
    float along = abs(vUv.x);
    float core = (1.0 - along * along) * (1.0 - vUv.y * vUv.y);
    rgb = mix(uTint, vec3(1.0, 0.97, 0.88), (1.0 - age) * core) * (1.4 - age);
    alpha = core * core * (1.0 - age) * strength;
    cover = 0.45;
  #else
    float falloff = exp(-radius * radius * 5.0);
    float core = exp(-radius * radius * 26.0);
    // Saturated halo tints the (often bright) sky; the white core adds light.
    float halo = falloff * 0.75;
    rgb = mix(uTint, vec3(1.0, 0.98, 1.0), core / (halo + core)) * 1.2;
    alpha = (halo + core) * strength;
    cover = 0.6 * halo / max(halo + core, 1e-4);
  #endif
    gl_FragColor = vec4(rgb, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor = vec4(gl_FragColor.rgb * alpha, alpha * cover);
  }
`,m=class{capacity;mesh;position;velocity;data;count=0;constructor(t,a,o,c=0){this.capacity=t;let l=new s;l.setAttribute(`position`,new i([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3)),l.setIndex([0,1,2,0,2,3]);let m=n=>{let r=new e(new Float32Array(t*n),n);return r.setUsage(u),r};this.position=m(3),this.velocity=m(3),this.data=m(4),l.setAttribute(`iPosition`,this.position),l.setAttribute(`iVelocity`,this.velocity),l.setAttribute(`iData`,this.data),l.instanceCount=0;let h=new r({uniforms:{uTime:{value:0},uTint:{value:o},uStretch:{value:c}},vertexShader:f,fragmentShader:p.replace(`__LOOK__`,String(a)),transparent:!0,depthWrite:!1,toneMapped:a!==d.Glow&&a!==d.Spark,blending:5,blendSrc:201,blendDst:205});this.mesh=new n(l,h),this.mesh.frustumCulled=!1,this.mesh.renderOrder=a===d.Smoke?1:2}begin(e){this.count=0,this.mesh.material.uniforms.uTime.value=e}push(e,t,n,r,i,a){if(this.count>=this.capacity||r<=0||a<=0)return;let o=this.count++;this.position.setXYZ(o,e.x,e.y,e.z),t?this.velocity.setXYZ(o,t.x,t.y,t.z):this.velocity.setXYZ(o,0,0,0),this.data.setXYZW(o,n,r,i,a)}end(){let e=this.mesh.geometry;e.instanceCount=this.count;for(let e of[this.position,this.velocity,this.data])e.clearUpdateRanges(),e.addUpdateRange(0,this.count*e.itemSize),e.needsUpdate=!0}get live(){return this.count}dispose(){this.mesh.geometry.dispose(),this.mesh.material.dispose()}};function h(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}var g=1/90,_=e=>Math.min(1,Math.max(0,e)),v=(e,t,n)=>{let r=_((n-e)/(t-e));return r*r*(3-2*r)},y={sun:{norm:.205,rate:150,speed:9,spread:.1,life:.6,size1:.5,buoyancy:2.6,drag:1.8,coreRate:0,sparkRate:22,sparkSpeed:9,gravity:-1.2,smokeChance:.14,light:9,charge:{size:.1,strength:.55,light:1.6}},night:{norm:.407,rate:170,speed:10,spread:.075,life:.65,size1:.55,buoyancy:1,drag:1.9,coreRate:230,sparkRate:34,sparkSpeed:10,gravity:-.4,smokeChance:.1,light:8,charge:{size:.26,strength:1,light:3}}},b=class{style;scale;root=new t;light;spec;stream;flames;smoke;sparks;glow;live={flame:[],smoke:[],spark:[]};origin=new l;direction=new l;scratch=new l;side=new l;up=new l;rng=h(1);time=-1;carry={flame:0,core:0,smoke:0,spark:0};disposed=!1;constructor(e,t){if(this.style=e,this.scale=t,!Number.isFinite(t)||t<=0)throw Error(`불 뿜기 효과의 크기를 확인할 수 없어요.`);this.spec=c[e],this.stream=y[e];let n=e===`sun`;this.root.name=`FireBreath-${e}`,this.flames=new m(n?320:400,n?d.Flame:d.Plasma,new o(n?`#ff9a3c`:`#9b7bff`)),this.smoke=new m(160,d.Smoke,new o(n?`#aaa197`:`#a497cf`)),this.sparks=new m(96,d.Spark,new o(n?`#ffb347`:`#a98bff`),.11),this.glow=new m(8,d.Glow,new o(n?`#ff8a2a`:`#7a4dff`),.035),this.root.add(this.smoke.mesh,this.flames.mesh,this.sparks.mesh,this.glow.mesh),this.light=new a(n?`#ff8a32`:`#8c6bff`,0,7,2),this.light.name=`FireBreathLight`,this.root.add(this.light),this.reset()}static mouthScale(e){let t=0;if(e.traverse(e=>{let n=e.userData.mouth?.halfWidth;Number.isFinite(n)&&n>0&&(t=n)}),!t)throw Error(`입 크기를 확인할 수 없어요.`);return t}get duration(){return this.spec.duration}get counts(){return{flame:this.live.flame.length,smoke:this.live.smoke.length,spark:this.live.spark.length}}reset(){this.rng=h(this.style===`sun`?7:11),this.live.flame.length=0,this.live.smoke.length=0,this.live.spark.length=0,this.carry={flame:0,core:0,smoke:0,spark:0},this.time=0}update(e,t){if(this.disposed)return;if(e===null||!Number.isFinite(e)){(this.time!==0||this.root.visible)&&this.reset(),this.root.visible=!1,this.light.intensity=0;return}this.root.visible=!0,e<this.time&&this.reset(),t.updateWorldMatrix(!0,!1);let n=t.matrixWorld.elements;for(this.direction.set(n[4],n[5],n[6]).normalize(),this.up.set(n[8],n[9],n[10]).normalize(),this.side.crossVectors(this.direction,this.up).normalize(),this.origin.set(n[12],n[13],n[14]).addScaledVector(this.direction,-.12*this.scale);this.time<e;){let t=Math.min(g,e-this.time);this.time+=t,this.step(t)}this.draw()}spawn(e,t,n,r,i,a,o,s){e.length>=t||e.push({position:n.clone(),velocity:r.clone(),age:0,life:i,size0:a,size1:o,seed:this.rng(),strength:s})}jitter(e,t,n){let r=this.rng()*Math.PI*2,i=Math.sqrt(this.rng())*n;return e.copy(this.direction).addScaledVector(this.side,Math.cos(r)*i).addScaledVector(this.up,Math.sin(r)*i).normalize().multiplyScalar(t)}emit(e,t,n,r){for(this.carry[e]+=t*n;this.carry[e]>=1;)--this.carry[e],r()}breath(e){let{fireStart:t,fireEnd:n}=this.spec.effect;return v(t-.02,t+.16,e)*(1-v(n-.3,n,e))}charge(e){let{glowStart:t,fireStart:n}=this.spec.effect;return v(t,n,e)*(1-v(n,n+.18,e))}step(e){let t=this.time,n=this.stream,{fireEnd:r,smokeEnd:i}=this.spec.effect,a=this.scale/n.norm,o=this.breath(t);if(o>0){let t=.55+.45*o;this.emit(`flame`,n.rate*o,e,()=>{let e=this.scratch.copy(this.origin).addScaledVector(this.direction,this.rng()*.04*a),r=this.jitter(new l,n.speed*(1+this.rng()*.26)*a*t,n.spread);this.spawn(this.live.flame,this.flames.capacity,e,r,n.life*(1+this.rng()*.55),.07*a,n.size1*(1+this.rng()*.6)*a,.75+.25*o)}),this.emit(`core`,n.coreRate*o,e,()=>{let e=this.jitter(new l,n.speed*1.25*(1+this.rng()*.15)*a*t,n.spread*.35);this.spawn(this.live.flame,this.flames.capacity,this.origin,e,.22+this.rng()*.12,.06*a,.17*a,1)}),this.emit(`spark`,n.sparkRate*o,e,()=>{let e=this.jitter(new l,n.sparkSpeed*(1+this.rng()*.4)*a,.26);this.spawn(this.live.spark,this.sparks.capacity,this.origin,e,.45+this.rng()*.45,.016*a,.01*a,1)})}let s=v(r-.2,r+.1,t)*(1-v(r+.4,i,t));s>0&&this.emit(`smoke`,9*s,e,()=>{let e=this.jitter(new l,.35*a,.6);e.y+=.45*a,this.spawn(this.live.smoke,this.smoke.capacity,this.origin,e,1.3+this.rng()*.6,.06*a,.32*a,.75)}),this.integrate(e,a);let c=.82+.1*Math.sin(t*31.7)+.08*Math.sin(t*53.3+1.3),u=this.charge(t);this.light.intensity=(o*n.light*c+u*u*n.charge.light)*a*a,this.light.distance=7*a,this.light.position.copy(this.origin).addScaledVector(this.direction,o>0?.9*a:.05*a)}integrate(e,t){let n=this.stream,r=t=>{for(let n=t.length-1;n>=0;n--){let r=t[n];r.age+=e/r.life,r.age>=1&&t.splice(n,1)}};for(let r of this.live.flame){r.velocity.multiplyScalar(Math.exp(-n.drag*e)),r.velocity.y+=n.buoyancy*r.age*t*e;let i=r.seed*40+this.time*7;r.velocity.x+=Math.sin(i)*.9*t*e,r.velocity.z+=Math.cos(i*1.3)*.9*t*e,r.position.addScaledVector(r.velocity,e);let a=1-(1-r.age)**1.6,o=r.size0+(r.size1-r.size0)*a;r.position.y<o&&(r.position.y=o,r.velocity.y=Math.abs(r.velocity.y)*.15,r.velocity.x*=1.02,r.velocity.z*=1.02),r.age+e/r.life>=1&&this.rng()<n.smokeChance&&this.live.smoke.length<this.smoke.capacity&&this.spawn(this.live.smoke,this.smoke.capacity,r.position,this.scratch.copy(r.velocity).multiplyScalar(.4).add(new l(0,.5*t,0)),1.2+this.rng()*.7,r.size1*.5,r.size1*1.25,.55)}for(let n of this.live.smoke){n.velocity.multiplyScalar(Math.exp(-1.3*e)),n.velocity.y+=.5*t*e;let r=n.seed*30+this.time*1.7;n.velocity.x+=Math.sin(r)*.25*t*e,n.velocity.z+=Math.cos(r)*.25*t*e,n.position.addScaledVector(n.velocity,e)}for(let r of this.live.spark)r.velocity.multiplyScalar(Math.exp(-1.6*e)),r.velocity.y+=n.gravity*t*e,r.position.addScaledVector(r.velocity,e),r.position.y<.02&&(r.age=1);r(this.live.flame),r(this.live.smoke),r(this.live.spark)}draw(){let e=this.time,t=e=>{let t=1-(1-e.age)**1.6;return e.size0+(e.size1-e.size0)*t},n=e=>v(0,.06,e.age);this.flames.begin(e);for(let e of this.live.flame)this.flames.push(e.position,null,e.age,t(e),e.seed,e.strength*n(e));this.flames.end(),this.smoke.begin(e);for(let e of this.live.smoke)this.smoke.push(e.position,null,e.age,t(e),e.seed,e.strength);this.smoke.end(),this.sparks.begin(e);for(let e of this.live.spark)this.sparks.push(e.position,e.velocity,e.age,t(e),e.seed,e.strength);this.sparks.end();let r=this.stream,i=this.scale/r.norm,{fireStart:a,fireEnd:o}=this.spec.effect,s=this.charge(e),c=1+.08*Math.sin(e*38),l=v(a,a+.1,e)*(1-v(o-.25,o,e));this.glow.begin(e),this.scratch.copy(this.origin).addScaledVector(this.direction,.1*i),this.glow.push(this.scratch,null,0,(.06+r.charge.size*s)*c*i,.1,s*r.charge.strength),this.scratch.copy(this.origin).addScaledVector(this.direction,.12*i),this.glow.push(this.scratch,null,0,(this.style===`sun`?.22:.34)*i,.6,l*(this.style===`sun`?.3:.55)),this.glow.end()}dispose(){if(!this.disposed){this.disposed=!0,this.root.removeFromParent();for(let e of[this.flames,this.smoke,this.sparks,this.glow])e.dispose();this.light.dispose()}}};export{b as t};