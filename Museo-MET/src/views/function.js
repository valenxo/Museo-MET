document.addEventListener('DOMContentLoaded', () => {
    const departmentSelect = document.getElementById('department');
    const searchForm = document.getElementById('searchForm');
    const resultsDiv = document.getElementById('results');
    const paginationDiv = document.getElementById('pagination');

    let currentPage = 1;
    let totalPages = 1;
    const resultsPerPage = 20; // 4 columns * 5 rows
    let objectIds = []; // Almacena los ID de los objetos para la paginación

    // Cargar departamentos al iniciar
    fetch('https://collectionapi.metmuseum.org/public/collection/v1/departments')
        .then(response => response.json())
        .then(data => {
            data.departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.departmentId;
                option.textContent = dept.displayName;
                departmentSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error loading departments:', error));

    // Manejar la búsqueda
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const departmentId = departmentSelect.value;
        const keyword = document.getElementById('keyword').value.trim();
        const geoLocation = document.getElementById('geoLocation').value.trim();

        if (!departmentId && !keyword && !geoLocation) {
            alert("Ingrese al menos un parámetro de búsqueda.");
            return;
        }

        const searchParams = new URLSearchParams();
        if (departmentId) searchParams.append('departmentId', departmentId);
        if (geoLocation) searchParams.append('geoLocation', geoLocation);
        if (keyword) searchParams.append('q', keyword);

        fetch(`https://collectionapi.metmuseum.org/public/collection/v1/search?${searchParams.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (!data.objectIDs || data.objectIDs.length === 0) {
                    resultsDiv.innerHTML = `<p>No se encontraron resultados.</p>`;
                    paginationDiv.innerHTML = '';
                    return;
                }
                objectIds = data.objectIDs; // Guardar los ID de los objetos para la paginación
                totalPages = Math.ceil(objectIds.length / resultsPerPage);
                currentPage = 1; // Reiniciar la página actual
                displayResults(objectIds);
                setupPagination();
            })
            .catch(error => {
                console.error("Error fetching data:", error);
                resultsDiv.innerHTML = `<p>Ingrese palabra clave.</p>`;
            });
    });

    function displayResults(objectIds) {
        resultsDiv.innerHTML = '';
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        const paginatedIds = objectIds.slice(startIndex, endIndex);



        paginatedIds.forEach(id => {
            fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
                .then(response => response.json())
                .then(object => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `
                        <img src="${object.primaryImageSmall || '/image/sinImagen.jpg'}" alt="${object.title}" class="img-small">
                        <h3>${object.title}</h3>
                        <p>Cultura: ${object.culture || 'Desconocida'}</p>
                        <p>Dinastía: ${object.dynasty || 'Desconocida'}</p>
                        <a href="/object/${object.objectID}">Ver imágenes adicionales</a>
                    `;
                    resultsDiv.appendChild(card);
                })
                .catch(error => console.error('Error loading object:', error));
        });
    }


    function setupPagination() {
        paginationDiv.innerHTML = '';
      
        if (totalPages > 1) {
          const previousButton = document.createElement('button');
          previousButton.textContent = 'Anterior';
          previousButton.disabled = currentPage === 1;
          previousButton.onclick = () => {
            if (currentPage > 1) {
              currentPage--;
              displayResults(objectIds);
              setupPagination();
            }
          };
          paginationDiv.appendChild(previousButton);
      
          const nextButton = document.createElement('button');
          nextButton.textContent = 'Siguiente';
          nextButton.disabled = currentPage === totalPages;
          nextButton.onclick = () => {
            if (currentPage < totalPages) {
              currentPage++;
              displayResults(objectIds);
              setupPagination();
            }
          };
          paginationDiv.appendChild(nextButton);
        }
      }
});
