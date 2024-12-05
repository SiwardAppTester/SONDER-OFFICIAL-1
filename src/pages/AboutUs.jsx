import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const AboutUsContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at center, #1a1a1a, #000000);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;
`;

const SphereContent = styled.div`
  width: 80%;
  max-width: 800px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  aspect-ratio: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: white;
  position: relative;
  box-shadow: 0 0 50px rgba(255, 255, 255, 0.1);
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  background: linear-gradient(45deg, #f3f3f3, #919191);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Story = styled.p`
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  max-width: 80%;
  color: #e0e0e0;
`;

const FloatingParticle = styled(motion.div)`
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
`;

const AboutUs = () => {
  return (
    <AboutUsContainer>
      {[...Array(20)].map((_, i) => (
        <FloatingParticle
          key={i}
          initial={{ 
            x: Math.random() * window.innerWidth, 
            y: Math.random() * window.innerHeight 
          }}
          animate={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            transition: {
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear"
            }
          }}
        />
      ))}
      <SphereContent>
        <Title>The Story of Sonder</Title>
        <Story>
          Sonder (n.) - The realization that each random passerby is living a life as vivid and complex as your own.
        </Story>
        <Story>
          In this vast universe of consciousness, every person you pass by carries their own universe within. Each individual is the main character of their own story, complete with their own struggles, dreams, routines, and relationships.
        </Story>
        <Story>
          Our mission is to capture this profound realization - that behind every window, in every passing car, and within every distant silhouette, there exists an entire world as rich and complicated as your own.
        </Story>
        <Story>
          Through our digital sphere, we invite you to explore this interconnected web of human experience, reminding us that we are all protagonists in our own epic narratives, yet simultaneously extras in countless others'.
        </Story>
      </SphereContent>
    </AboutUsContainer>
  );
};

export default AboutUs; 