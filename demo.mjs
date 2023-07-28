import Glide from '@glidejs/glide'

window.Glide = Glide

var toolbarOptions = [
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
  ['blockquote', 'link', 'image'],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
  [{'align': []}],
  ['code-block'],
  ['clean']                                         // remove formatting button
];
var options = {
  bounds: '#editor .editor',
  modules: {
    toolbar: toolbarOptions
  },
  theme: 'snow'
};

var editor = new Quill('#editor .editor', options);

editor.on('text-change', function(delta, oldDelta, source) {
  var activeCodeButtons = document.querySelectorAll('.code-button.active');
  for (var i = 0; i < activeCodeButtons.length; i++) {
    activeCodeButtons[i].classList.remove('active');
    activeCodeButtons[i].parentElement.querySelector('.code').style.display = 'none';
  }

  shortcodes.reinitialize(document.querySelector('#editor .ql-editor').cloneNode(true), function(){
    // https://www.youtube.com/watch?v=qetW6R9Jxs4
  });
});

function parseDOM(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return doc.body.firstChild
}

window.parseDOM = parseDOM

function codeButton(codeButton) {
  var activeCodeButtons = document.querySelectorAll('.code-button.active');
  for (var i = 0; i < activeCodeButtons.length; i++) {
    if (activeCodeButtons[i] === codeButton) continue;
    activeCodeButtons[i].classList.remove('active');
    activeCodeButtons[i].parentElement.querySelector('.code').style.display = 'none';
  }

  var code = codeButton.parentElement.querySelector('.code');
  var root = codeButton.closest('.shortcode-js');

  if (codeButton.classList.contains('active')) {
    codeButton.classList.remove('active');
    code.style.display = 'none';
  } else {
    codeButton.classList.add('active');
    code.style.maxHeight = root.offsetHeight - 118 + 'px';
    code.style.height = 'calc(100vh - 118px)';
    code.style.display = 'block';
  }
}

document.addEventListener('click', function(event) {
  var codeBtn = event.target.classList.contains('code-button') ? event.target : event.target.closest('.code-button');

  if (codeBtn) {
    event.preventDefault();
    codeButton(codeBtn);
    return;
  }

  if (event.target.matches('a[target="_action"]')) {
    event.preventDefault();
    if (event.target.getAttribute('href') === '#view-code') {
      codeButton(event.target.closest('.shortcode-js').querySelector('.code-button'));
    } else if (event.target.getAttribute('href') === '#toggle-editor') {
      toggleEditor();
    }

    return;
  }

  const editorCaret = event.target.classList.contains('toggle-editor') ? event.target : event.target.closest('.toggle-editor');

  if (editorCaret) {
    event.preventDefault();
    toggleEditor();
    return;
  }
});

var editorCaret = document.querySelector('.sidebar .carret a');
function toggleEditor() {
  editorCaret.classList.toggle('active');
  document.querySelector('body').classList.toggle('editor-active');
}

matchMedia('(max-width: 960px)', function() {
  document.body.classList.remove('editor-active');
})

if (window.innerWidth < 960) {
  document.body.classList.remove('editor-active');
}
