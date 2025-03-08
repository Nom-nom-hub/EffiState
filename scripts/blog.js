document.addEventListener('DOMContentLoaded', function() {
  // Handle newsletter subscription
  const subscribeForm = document.querySelector('.subscribe-form');
  
  if (subscribeForm) {
    subscribeForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const emailInput = subscribeForm.querySelector('input[type="email"]');
      const email = emailInput.value;
      
      // Simulate subscription
      alert(`Thank you for subscribing with ${email}! You'll receive our newsletter soon.`);
      
      // Reset form
      emailInput.value = '';
    });
  }
  
  // Handle social sharing
  const shareButtons = document.querySelectorAll('.share-button');
  
  shareButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const platform = button.getAttribute('data-platform');
      const url = encodeURIComponent(window.location.href);
      const title = encodeURIComponent(document.title);
      
      let shareUrl;
      
      switch (platform) {
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
          break;
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
          break;
        default:
          return;
      }
      
      window.open(shareUrl, '_blank', 'width=600,height=400');
    });
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