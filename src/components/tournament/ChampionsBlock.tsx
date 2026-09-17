import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import type { Category } from '@/store/slices/registrationSlice';
import { getCategoryBracket } from '@/api/match';
import { championOf } from '@/lib/bracketView';
import { InitialsAvatar } from '@/components/InitialsAvatar';

interface Champion {
  categoryId: string;
  categoryName: string;
  name: string;
  logo: string | undefined;
}

/**
 * Who won each category, once someone has.
 *
 * Renders nothing at all until a final is decided — an empty "Champions"
 * heading on a tournament still in its group stage is worse than no heading.
 */
export function ChampionsBlock({ categories }: { categories: Category[] }) {
  const [champions, setChampions] = useState<Champion[]>([]);

  const categoryKey = categories.map((c) => c._id).join(',');

  useEffect(() => {
    if (categories.length === 0) {
      setChampions([]);
      return;
    }
    let active = true;
    Promise.all(
      categories.map((c) =>
        getCategoryBracket(c._id)
          .then((b) => {
            const won = championOf(b.matches ?? [], b.competitorType);
            return won ? { categoryId: c._id, categoryName: c.name, name: won.name, logo: won.logo } : null;
          })
          // No bracket for this category, or it could not be read. Either way
          // there is no champion to announce and nothing worth an error.
          .catch(() => null),
      ),
    ).then((found) => {
      if (!active) return;
      setChampions(found.filter((c): c is Champion => c !== null));
    });
    return () => { active = false; };
  }, [categoryKey, categories]);

  if (champions.length === 0) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#FFC53D', marginBottom: 8 }}>
        {champions.length > 1 ? 'Champions' : 'Champion'}
      </Text>
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,197,61,0.45)', borderRadius: 6, overflow: 'hidden' }}>
        {champions.map((c, i) => (
          <View key={c.categoryId}>
            {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.08)' }} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 }}>
              <Text style={{ fontSize: 22 }}>🏆</Text>
              <InitialsAvatar name={c.name} logo={c.logo} size={38} color="#FFC53D" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, lineHeight: 22, color: '#fff' }}>
                  {c.name}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#FFC53D', marginTop: 5 }}>
                  {c.categoryName} champions
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
