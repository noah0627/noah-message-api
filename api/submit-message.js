// api/submit-message.js
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', 'https://noah0627.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { author, content } = req.body;
  
  if (!author || !content) {
    return res.status(400).json({ error: '作者和内容不能为空' });
  }

  if (content.length > 500) {
    return res.status(400).json({ error: '留言内容不能超过500字' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: '服务器配置错误' });
  }

  const REPO = 'noah0627/noah0627.github.io';
  const PATH = 'files/website/note.txt';

  try {
    console.log('开始获取文件内容...');
    
    // 1. 获取当前文件内容和SHA
    const fileResponse = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${PATH}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Noah-Message-Submit'
        }
      }
    );

    console.log('GitHub API响应状态:', fileResponse.status);
    
    let fileData;
    let currentContent = '';
    
    if (fileResponse.status === 404) {
      // 文件不存在，创建新文件
      console.log('文件不存在，将创建新文件');
      fileData = { sha: null };
    } else if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      console.error('GitHub API错误:', errorText);
      
      if (fileResponse.status === 401) {
        throw new Error('GitHub认证失败，请检查令牌权限');
      } else {
        throw new Error(`GitHub API错误: ${fileResponse.status}`);
      }
    } else {
      fileData = await fileResponse.json();
      console.log('成功获取文件数据');
      
      // 解码内容
      if (fileData.content) {
        currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');
      }
    }
    
    // 2. 添加新留言
    const newMessage = `作者:${author}\n时间:${new Date().toLocaleString('zh-CN')}\n内容:${content}\n\n`;
    const newContent = currentContent + newMessage;
    
    // 3. 更新文件
    const updateResponse = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `添加新留言 - ${author}`,
          content: Buffer.from(newContent).toString('base64'),
          sha: fileData.sha || undefined
        })
      }
    );

    console.log('更新文件响应状态:', updateResponse.status);
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('更新文件错误:', errorText);
      throw new Error('提交留言失败');
    }
    
    console.log('留言提交成功');
    return res.status(200).json({ success: true, message: '留言提交成功' });
    
  } catch (error) {
    console.error('提交留言失败:', error);
    return res.status(500).json({ error: error.message });
  }
}
