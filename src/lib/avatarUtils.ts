const backgrounds = ['b6e3f4', 'c0aede', 'ffdfbf', 'ffd5dc', 'd1d4f9', 'ffd5dc', 'b6e3f4', 'd1d4f9'];

export const getAvatarUrl = (name: string, index: number = 0) => {
  const bg = backgrounds[index % backgrounds.length];
  return `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(name)}&backgroundColor=${bg}`;
};
