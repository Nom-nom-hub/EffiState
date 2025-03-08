document.addEventListener('DOMContentLoaded', function() {
  // Handle mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', function() {
      sidebar.classList.toggle('active');
    });
  }
  
  // Handle code copy functionality
  const codeBlocks = document.querySelectorAll('pre');
  
  codeBlocks.forEach(block => {
    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy';
    
    // Add button to code block
    block.appendChild(copyButton);
    
    // Add click event
    copyButton.addEventListener('click', function() {
      const code = block.querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(function() {
        copyButton.textContent = 'Copied!';
        setTimeout(function() {
          copyButton.textContent = 'Copy';
        }, 2000);
      }, function() {
        copyButton.textContent = 'Failed to copy';
      });
    });
  });
  
  // Add anchor links to headings
  const headings = document.querySelectorAll('h2, h3');
  
  headings.forEach(heading => {
    if (heading.id) {
      const anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = `#${heading.id}`;
      anchor.textContent = '#';
      
      heading.appendChild(anchor);
    }
  });
  
  // Handle internal documentation links
  document.querySelectorAll('a:not([target="_blank"])').forEach(link => {
    if (link.getAttribute('href').startsWith('/') || link.getAttribute('href').startsWith('./')) {
      link.addEventListener('click', (e) => {
        // This is a simulation for demo purposes
        if (link.getAttribute('href').includes('html')) {
          // Let normal navigation proceed for HTML files that exist
          return;
        }
        
        e.preventDefault();
        
        // For demo purposes, show notification instead of navigation
        const path = link.getAttribute('href');
        alert(`In a production site, this would navigate to: ${path}\n\nThe complete EffiState documentation system includes this page.`);
      });
    }
  });
}); 