import axios from 'axios';


async function seedData(url: string) {
    let response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Root' }));

    const rootId = response.data;

    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 1', parentId: rootId }), { headers: { 'Content-Type': 'application/json' } });
    const child1Id = response.data;
    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 1 a', parentId: child1Id }), { headers: { 'Content-Type': 'application/json' } });
    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 1 b', parentId: child1Id }), { headers: { 'Content-Type': 'application/json' } });
    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 1 c', parentId: child1Id }), { headers: { 'Content-Type': 'application/json' } });

    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 2', parentId: rootId }), { headers: { 'Content-Type': 'application/json' } });
    const child2Id = response.data;
    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 2 a', parentId: child2Id }), { headers: { 'Content-Type': 'application/json' } });
    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 2 b', parentId: child2Id }), { headers: { 'Content-Type': 'application/json' } });
    const child2bId = response.data;
    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 2 b i', parentId: child2bId }), { headers: { 'Content-Type': 'application/json' } });
    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 2 b ii', parentId: child2bId }), { headers: { 'Content-Type': 'application/json' } });
    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 2 b iii', parentId: child2bId }), { headers: { 'Content-Type': 'application/json' } });
    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 2 b iv', parentId: child2bId }), { headers: { 'Content-Type': 'application/json' } });
    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 2 c', parentId: child2Id }), { headers: { 'Content-Type': 'application/json' } });

    response = await axios.post(`${url}/nodes`, JSON.stringify({ name: 'Child 3', parentId: rootId }), { headers: { 'Content-Type': 'application/json' } });
    const child3Id = response.data;

    console.log('Root Node ID');
    console.log(rootId);
}

module.exports = seedData(process.argv.slice(2)[0]);
