function createTextGeometry() {
  const textMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    metalness: 0.3,
    roughness: 0.4
  });

  // Create individual letters
  const letters = [];
  const word = 'sonder';
  const radius = 1.5; // Increased radius to match sphere size
  const arc = Math.PI * 0.4; // Reduced arc for tighter curve
  
  for(let i = 0; i < word.length; i++) {
    const letter = new THREE.TextGeometry(word[i], {
      font: font,
      size: 0.15, // Smaller size
      height: 0.03,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.005,
      bevelOffset: 0,
      bevelSegments: 5
    });

    // Center each letter individually
    letter.computeBoundingBox();
    const centerOffset = new THREE.Vector3();
    letter.boundingBox.getCenter(centerOffset);
    letter.translate(-centerOffset.x, -centerOffset.y, -centerOffset.z);

    const letterMesh = new THREE.Mesh(letter, textMaterial);
    
    // Calculate position on sphere
    const angle = (i / (word.length - 1)) * arc - (arc / 2);
    
    // Position letters along the sphere's surface
    const phi = Math.PI * 0.15; // Angle from the top of the sphere
    letterMesh.position.x = Math.sin(angle) * radius * Math.sin(phi);
    letterMesh.position.y = radius * Math.cos(phi) + 0.5; // Position near top of sphere
    letterMesh.position.z = Math.cos(angle) * radius * Math.sin(phi);
    
    // Make letters face outward from sphere center
    letterMesh.lookAt(0, letterMesh.position.y - 0.5, 0);
    letterMesh.rotateY(Math.PI); // Face letters outward
    
    letters.push(letterMesh);
    scene.add(letterMesh);
  }

  return letters;
}

// Update your animation loop to include the letters array
const letters = createTextGeometry();

function animate() {
  requestAnimationFrame(animate);
  
  // Rotate all letters together with the sphere
  letters.forEach(letter => {
    letter.rotation.y += 0.01;
  });

  renderer.render(scene, camera);
} 