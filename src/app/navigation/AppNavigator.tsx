import React, { useState } from 'react';
import { SplashScreen } from '../../features/splash/SplashScreen';
import { HomeScreen } from '../../features/home/HomeScreen';
import { TemplatesScreen } from '../../features/templates/TemplatesScreen';
import { EditorScreenV2 } from '../../features/editor/EditorScreen.v2';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { Template } from '../../shared/types';
import { useProjectStore } from '../../entities/project/store';

type Screen = 'splash' | 'home' | 'templates' | 'editor' | 'settings';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [settingsReturnScreen, setSettingsReturnScreen] =
    useState<Screen>('home');
  const { currentProject, setCurrentProject } = useProjectStore();

  const handleSplashComplete = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToEditor = () => {
    setCurrentScreen('editor');
  };

  const handleNavigateToTemplates = () => {
    setCurrentScreen('templates');
  };

  const handleNavigateToSettings = () => {
    setSettingsReturnScreen(currentScreen);
    setCurrentScreen('settings');
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCurrentScreen('editor');
  };

  const handleBack = () => {
    setCurrentScreen('home');
    setSelectedTemplate(null);
    setCurrentProject(null);
  };

  const handleBackFromSettings = () => {
    setCurrentScreen(settingsReturnScreen === 'splash' ? 'home' : settingsReturnScreen);
  };

  switch (currentScreen) {
    case 'splash':
      return <SplashScreen onComplete={handleSplashComplete} />;
    case 'home':
      return (
        <HomeScreen
          onNavigateToEditor={handleNavigateToEditor}
          onNavigateToTemplates={handleNavigateToTemplates}
          onNavigateToSettings={handleNavigateToSettings}
        />
      );
    case 'templates':
      return (
        <TemplatesScreen
          onBack={handleBack}
          onSelectTemplate={handleSelectTemplate}
          onNavigateToSettings={handleNavigateToSettings}
        />
      );
    case 'editor':
      return (
        <EditorScreenV2
          onBack={handleBack}
          layout={selectedTemplate?.layout}
          projectId={currentProject?.id}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          onBack={handleBackFromSettings}
          onNavigateToHome={() => setCurrentScreen('home')}
          onNavigateToTemplates={() => setCurrentScreen('templates')}
        />
      );
    default:
      return (
        <HomeScreen
          onNavigateToEditor={handleNavigateToEditor}
          onNavigateToTemplates={handleNavigateToTemplates}
          onNavigateToSettings={handleNavigateToSettings}
        />
      );
  }
};
