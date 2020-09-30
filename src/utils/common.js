
export function normalize(data, key = 'id') {
  const transform = obj => {
    let id = obj[key];
    return {
      [id]: obj
    };
  };

  if (Array.isArray(data)) {
    let result = data.reduce((partial, d) => {
      return {
        ...partial,
        ...transform(d)
      };
    }, {});
    return result;
  }

  return transform(data);
}
