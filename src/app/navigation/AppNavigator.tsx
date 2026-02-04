import React, { useState } from 'react';
import { SplashScreen } from '../../features/splash/SplashScreen';
import { HomeScreen } from '../../features/home/HomeScreen';
import { TemplatesScreen } from '../../features/templates/TemplatesScreen';
import { EditorScreenV2 } from '../../features/editor/EditorScreen.v2';
import { Template } from '../../shared/types';

type Screen = 'splash' | 'home' | 'templates' | 'editor';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );

  const handleSplashComplete = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToEditor = () => {
    setCurrentScreen('editor');
  };

  const handleNavigateToTemplates = () => {
    setCurrentScreen('templates');
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCurrentScreen('editor');
  };

  const handleBack = () => {
    setCurrentScreen('home');
    setSelectedTemplate(null);
  };

  switch (currentScreen) {
    case 'splash':
      return <SplashScreen onComplete={handleSplashComplete} />;
    case 'home':
      return (
        <HomeScreen
          onNavigateToEditor={handleNavigateToEditor}
          onNavigateToTemplates={handleNavigateToTemplates}
        />
      );
    case 'templates':
      return (
        <TemplatesScreen
          onBack={handleBack}
          onSelectTemplate={handleSelectTemplate}
        />
      );
    case 'editor':
      return (
        <EditorScreenV2 onBack={handleBack} layout={selectedTemplate?.layout} />
      );
    default:
      return (
        <HomeScreen
          onNavigateToEditor={handleNavigateToEditor}
          onNavigateToTemplates={handleNavigateToTemplates}
        />
      );
  }
};
