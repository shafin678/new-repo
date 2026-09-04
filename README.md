# Hash Ring Lab

A beginner-friendly, interactive visual lesson for learning consistent hashing.

Open `index.html` in a browser, or serve the directory locally:

```bash
python3 -m http.server 8000
```

The six-part lesson covers:

- why modulo-based sharding remaps data;
- the hash ring and clockwise ownership;
- minimal movement when cluster membership changes;
- virtual nodes and load balance;
- replication, use cases, and limitations.