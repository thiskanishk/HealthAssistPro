
self.onmessage = function (e) {
  const { docDefinition } = e.data;
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.70/pdfmake.min.js');
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.70/vfs_fonts.js');
  
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  pdfDocGenerator.getBlob(blob => {
    self.postMessage(blob);
  });
};
