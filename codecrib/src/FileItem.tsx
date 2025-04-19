import React from 'react';

interface FileItemProps {
  fileName: string;
}

const FileItem: React.FC<FileItemProps> = ({ fileName }) => {
  const getFileIcon = (name: string) => {
    const extension = name.split('.').pop()?.toLowerCase();
    const iconMap: { [key: string]: string } = {
      js: 'https://img.icons8.com/?size=100&id=108784&format=png&color=000000',
      html: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/HTML5_logo_and_wordmark.svg/512px-HTML5_logo_and_wordmark.svg.png',
      css: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Official_CSS_Logo.svg/120px-Official_CSS_Logo.svg.png',
      py: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/150px-Python-logo-notext.svg.png',
      json: 'https://img.icons8.com/?size=100&id=114474&format=png&color=000000',
      tsx: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Typescript.svg/250px-Typescript.svg.png',
      md: 'https://img.icons8.com/?size=100&id=YOfC8o5ibXxX&format=png&color=FFFFFF',
      scss: 'https://img.icons8.com/?size=100&id=5qCsU3x4FSPD&format=png&color=FFFFFF',
      sql: 'https://img.icons8.com/?size=100&id=J6KcaRLsTgpZ&format=png&color=000000',
    };

    if (extension && iconMap[extension]) {
      return (
        <img
          src={iconMap[extension]}
          alt={`${extension} icon`}
          className="file-icon"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling!.textContent = '📄 ';
          }}
        />
      );
    }
    return <span>📄 </span>;
  };

  return (
    <div className="file-item">
      {getFileIcon(fileName)}
      <span>{fileName}</span>
    </div>
  );
};

export default FileItem;