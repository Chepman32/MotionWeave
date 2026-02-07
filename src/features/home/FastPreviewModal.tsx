import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { PreviewScreen } from '../preview/PreviewScreen';
import { Project } from '../../shared/types';

interface FastPreviewModalProps {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
}

export const FastPreviewModal: React.FC<FastPreviewModalProps> = ({
  visible,
  project,
  onClose,
}) => {
  if (!project) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <PreviewScreen
          project={project}
          onBack={onClose}
          soundEnabled={true}
          isVisible={visible}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
