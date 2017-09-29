/**
 * The remove the indent in code
 * 
 * @param {string} text Source code
 */
global.removeCodeIndent = (text: string) => {
  let lines = text.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") {
    i++;
  }
  const firstLine = lines[i];
  let leftTrimSize = 0;
  while (leftTrimSize < firstLine.length && firstLine[leftTrimSize] === " ") {
    leftTrimSize++;
  }

  return lines
    .slice(i)
    .map(line => line.substr(leftTrimSize))
    .join("\n")
    .trim();
};
