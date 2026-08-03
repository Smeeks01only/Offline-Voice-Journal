import React, { Component } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, fonts } from '../theme/tokens';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) {
      console.error("ErrorBoundary caught an error", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.heading}>Something went wrong</Text>
            <Text style={styles.subheading}>We encountered an unexpected error. Please close and reopen the app to continue.</Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.obsidian,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.paperWhite,
    marginBottom: 16,
    textAlign: 'center',
  },
  subheading: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slateGray,
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.paperWhite,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  buttonText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.obsidian,
  }
});

export default ErrorBoundary;
