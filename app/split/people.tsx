import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Input } from '@/components/Input';
import { ListRow } from '@/components/ListRow';
import { SafeAreaHeader } from '@/components/SafeAreaHeader';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { useToast } from '@/components/Toast';
import { Colors, Spacing } from '@/constants/Colors';
import { useSplitContext } from '@/contexts/SplitContext';

export default function PeopleScreen() {
  const router = useRouter();
  const { people, addPerson, removePerson } = useSplitContext();
  const { show } = useToast();
  const [newName, setNewName] = useState('');
  const c = Colors.light;

  const handleAddPerson = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addPerson(trimmed);
    setNewName('');
  };

  const navigateNext = () => {
    Keyboard.dismiss();
    router.push('/split/camera');
  };

  const handleNext = () => {
    // If the user typed a name but didn't add it, fold it in so it isn't lost.
    const pending = newName.trim();
    const totalPeople = people.length + (pending ? 1 : 0);

    if (totalPeople < 2) {
      show('Add at least one other person to split with', { type: 'info' });
      return;
    }

    if (pending) {
      addPerson(pending);
      setNewName('');
      show(`Added ${pending}`, { type: 'success' });
    }

    navigateNext();
  };

  const handleBack = () => {
    router.replace('/');
  };

  return (
    <Screen
      header={<SafeAreaHeader title="Who's splitting?" onBack={handleBack} />}
      footer={
        <Button
          title="Next: scan receipt"
          onPress={handleNext}
          rightIcon="arrow-forward"
        />
      }
    >
      <ThemedText type="default" muted style={styles.subtitle}>
        Add everyone who will split the bill.
      </ThemedText>

      <Input
        placeholder="Enter name"
        value={newName}
        onChangeText={setNewName}
        onSubmitEditing={handleAddPerson}
        returnKeyType="done"
        autoCapitalize="words"
        leftIcon="person-outline"
        containerStyle={styles.input}
        rightSlot={
          <IconButton
            icon="add"
            onPress={handleAddPerson}
            accessibilityLabel="Add person"
            variant="soft"
          />
        }
      />

      <View style={styles.list}>
        {people.map((person, index) => (
          <ListRow
            key={person.id}
            left={<Avatar name={person.name} index={index} />}
            title={person.name}
            subtitle={person.id === 'me' ? 'You' : undefined}
            right={
              person.id !== 'me' ? (
                <IconButton
                  icon="close-circle"
                  onPress={() => removePerson(person.id)}
                  accessibilityLabel={`Remove ${person.name}`}
                  color={c.mutedText}
                />
              ) : undefined
            }
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  input: {
    marginBottom: Spacing.lg,
  },
  list: {
    marginBottom: Spacing.lg,
  },
});
